// Curated grouping for the /resume-skills landing page. Slugs must match
// seed-skills/ directories; the detail pages live at /skills/thetestingacademy/<slug>.

export interface ResumeSkillEntry {
  slug: string;
  name: string;
  blurb: string;
}

export interface ResumeSkillGroup {
  id: string;
  title: string;
  description: string;
  skills: ResumeSkillEntry[];
}

export const resumeSkillGroups: ResumeSkillGroup[] = [
  {
    id: 'qa-personas',
    title: 'Built for QA roles',
    description:
      'Persona-specific skills written for testers: manual QA, SDET, DevOps, portfolios, and the interviews that follow.',
    skills: [
      {
        slug: 'qa-tester-resume-optimizer',
        name: 'QA Tester Resume Optimizer',
        blurb: 'Manual and functional QA resumes: test design vocabulary, defect metrics, ISTQB placement.',
      },
      {
        slug: 'automation-tester-resume-optimizer',
        name: 'Automation Tester Resume Optimizer',
        blurb: 'SDET resumes built around framework ownership, tool matrices, and CI evidence.',
      },
      {
        slug: 'automation-interview-prep',
        name: 'Automation Interview Prep',
        blurb: 'Round-by-round preparation: coding screens, framework design, scenarios, STAR stories.',
      },
      {
        slug: 'qa-project-portfolio-builder',
        name: 'QA Project Portfolio Builder',
        blurb: 'Turn suites and bug hunts into case studies with linkable repos and live CI.',
      },
      {
        slug: 'devops-engineer-resume-optimizer',
        name: 'DevOps Engineer Resume Optimizer',
        blurb: 'Pipeline ownership, IaC, and reliability metrics for DevOps and SRE resumes.',
      },
      {
        slug: 'qa-linkedin-profile-optimizer',
        name: 'QA LinkedIn Profile Optimizer',
        blurb: 'Headline tokens and skills ordering matched to how QA recruiters actually search.',
      },
    ],
  },
  {
    id: 'resume-core',
    title: 'Resume fundamentals',
    description: 'The core resume workflow: analyze the posting, tailor, quantify, format, pass the ATS.',
    skills: [
      {
        slug: 'resume-ats-optimizer',
        name: 'Resume ATS Optimizer',
        blurb: 'ATS compatibility checks and keyword matching against a specific job posting.',
      },
      {
        slug: 'resume-bullet-writer',
        name: 'Resume Bullet Writer',
        blurb: 'Rewrite task-language bullets into achievement statements with metrics.',
      },
      {
        slug: 'job-description-analyzer',
        name: 'Job Description Analyzer',
        blurb: 'Decode postings, calculate match scores, and build an application strategy.',
      },
      {
        slug: 'resume-tailor',
        name: 'Resume Tailor',
        blurb: 'Customize one master resume per posting without inventing experience.',
      },
      {
        slug: 'resume-quantifier',
        name: 'Resume Quantifier',
        blurb: 'Find the numbers hiding in your work history and add them honestly.',
      },
      {
        slug: 'resume-formatter',
        name: 'Resume Formatter',
        blurb: 'ATS-safe single-column layouts with clean, scannable structure.',
      },
      {
        slug: 'resume-section-builder',
        name: 'Resume Section Builder',
        blurb: 'Order and build each resume section for maximum screening impact.',
      },
      {
        slug: 'resume-version-manager',
        name: 'Resume Version Manager',
        blurb: 'Maintain a master resume and tailored variants without contradictions.',
      },
    ],
  },
  {
    id: 'applications',
    title: 'Applications and outreach',
    description: 'Cover letters, cold outreach, forms, and the profile recruiters find first.',
    skills: [
      {
        slug: 'cover-letter-generator',
        name: 'Cover Letter Generator',
        blurb: 'Personalized cover letters from your resume plus the job description.',
      },
      {
        slug: 'linkedin-profile-optimizer',
        name: 'LinkedIn Profile Optimizer',
        blurb: 'Sync your resume with LinkedIn and optimize for searchability.',
      },
      {
        slug: 'cold-email-writer',
        name: 'Cold Email Writer',
        blurb: 'Outreach to hiring managers that earns replies, not deletes.',
      },
      {
        slug: 'application-form-filler',
        name: 'Application Form Filler',
        blurb: 'Consistent, defensible answers across application portals.',
      },
      {
        slug: 'portfolio-case-study-writer',
        name: 'Portfolio Case Study Writer',
        blurb: 'Expand resume bullets into portfolio case studies recruiters read.',
      },
    ],
  },
  {
    id: 'interview-offer',
    title: 'Interviews and offers',
    description: 'From the first screen to the signed offer.',
    skills: [
      {
        slug: 'interview-prep-generator',
        name: 'Interview Prep Generator',
        blurb: 'STAR stories, practice questions, and talking points from your resume.',
      },
      {
        slug: 'salary-negotiation-prep',
        name: 'Salary Negotiation Prep',
        blurb: 'Market research, negotiation strategy, and counter-offer scripts.',
      },
      {
        slug: 'offer-comparison-analyzer',
        name: 'Offer Comparison Analyzer',
        blurb: 'Compare offers on total compensation and career trajectory.',
      },
      {
        slug: 'reference-list-builder',
        name: 'Reference List Builder',
        blurb: 'Format references properly and brief them on what to support.',
      },
    ],
  },
  {
    id: 'special-paths',
    title: 'Special career paths',
    description: 'Career changers, leadership, academia, and creative formats.',
    skills: [
      {
        slug: 'career-changer-translator',
        name: 'Career Changer Translator',
        blurb: 'Translate experience from any industry into your target role vocabulary.',
      },
      {
        slug: 'executive-resume-writer',
        name: 'Executive Resume Writer',
        blurb: 'Leadership resumes that speak in risk, releases, and team outcomes.',
      },
      {
        slug: 'academic-cv-builder',
        name: 'Academic CV Builder',
        blurb: 'Full CVs for academic and research positions.',
      },
      {
        slug: 'creative-portfolio-resume',
        name: 'Creative Portfolio Resume',
        blurb: 'When and how to use visual formats without losing the ATS.',
      },
    ],
  },
];

export const resumeSkillCount = resumeSkillGroups.reduce(
  (sum, group) => sum + group.skills.length,
  0,
);
