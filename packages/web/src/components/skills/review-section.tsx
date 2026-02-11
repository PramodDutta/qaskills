'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReviewUser {
  name: string;
  avatar: string;
  username: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user: ReviewUser;
}

interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

function Stars({
  rating,
  interactive,
  onRate,
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          className={`text-lg ${star <= rating ? 'text-yellow-500' : 'text-muted-foreground/30'} ${interactive ? 'cursor-pointer hover:text-yellow-400' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function UserAvatar({ user }: { user: ReviewUser }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || user.username}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  // Fallback: initials
  const initials = (user.name || user.username || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initials}
    </div>
  );
}

export function ReviewSection({ skillId }: { skillId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Auth state - we detect auth by attempting to check if Clerk is available
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Dynamically check Clerk auth status on client
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      import('@clerk/nextjs').then((clerk) => {
        // useAuth is a hook so we can't call it here directly.
        // Instead, we'll detect auth state via an API probe or rely on the
        // Clerk __session cookie presence as a heuristic.
        // A simpler approach: check if Clerk window object has a session.
        const clerkInstance = (window as unknown as Record<string, unknown>).Clerk as
          | { session?: { id?: string } }
          | undefined;
        if (clerkInstance?.session?.id) {
          setIsAuthenticated(true);
        } else {
          // Wait for Clerk to load, then check
          const checkSession = () => {
            const c = (window as unknown as Record<string, unknown>).Clerk as
              | { session?: { id?: string }; loaded?: boolean }
              | undefined;
            if (c?.loaded) {
              setIsAuthenticated(!!c.session?.id);
            } else {
              setTimeout(checkSession, 200);
            }
          };
          checkSession();
        }
      }).catch(() => {
        setIsAuthenticated(false);
      });
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reviews?skillId=${encodeURIComponent(skillId)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const data: ReviewsResponse = await res.json();
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
      setTotalReviews(data.totalReviews);
    } catch (err) {
      setError('Unable to load reviews. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (formRating === 0) {
      setSubmitError('Please select a star rating.');
      return;
    }

    if (formComment.length > 1000) {
      setSubmitError('Comment must be 1000 characters or fewer.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId,
          rating: formRating,
          comment: formComment.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        if (res.status === 401) {
          setSubmitError('Please sign in to leave a review.');
        } else if (res.status === 409) {
          setSubmitError('You have already reviewed this skill.');
        } else {
          setSubmitError(data.error || 'Failed to submit review.');
        }
        return;
      }

      // Success
      setSubmitSuccess(true);
      setFormRating(0);
      setFormComment('');
      setShowForm(false);
      // Refresh reviews list
      await fetchReviews();
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4">Reviews & Ratings</h2>

      {/* Average rating summary */}
      {!loading && totalReviews > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <Stars rating={Math.round(averageRating)} />
          <span className="text-sm text-muted-foreground">
            {averageRating} out of 5 ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      )}

      {!loading && totalReviews === 0 && (
        <p className="mb-6 text-sm text-muted-foreground">
          No reviews yet. Be the first to review this skill!
        </p>
      )}

      {loading && (
        <div className="mb-6 text-sm text-muted-foreground">Loading reviews...</div>
      )}

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Write a Review button / form */}
      <div className="mb-6">
        {isAuthenticated === false && (
          <p className="text-sm text-muted-foreground">
            Sign in to leave a review.
          </p>
        )}

        {isAuthenticated && !showForm && !submitSuccess && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Write a Review
          </button>
        )}

        {submitSuccess && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
            Your review has been submitted. Thank you!
          </div>
        )}

        {isAuthenticated && showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-border p-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Rating</label>
              <Stars rating={formRating} interactive onRate={setFormRating} />
            </div>
            <div>
              <label htmlFor="review-comment" className="block text-sm font-medium mb-1">
                Comment <span className="text-muted-foreground font-normal">(optional, max 1000 chars)</span>
              </label>
              <textarea
                id="review-comment"
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                placeholder="Share your experience with this skill..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formComment.length}/1000
              </p>
            </div>

            {submitError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || formRating === 0}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormRating(0);
                  setFormComment('');
                  setSubmitError('');
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews list */}
      {!loading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-md border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <UserAvatar user={review.user} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {review.user.name || review.user.username}
                    </span>
                    <Stars rating={review.rating} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
