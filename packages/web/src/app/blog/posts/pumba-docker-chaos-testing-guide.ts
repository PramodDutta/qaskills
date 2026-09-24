import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pumba Docker Chaos Testing: Network Fault Injection That Cleans Up',
  description: 'Pumba docker chaos testing kills, pauses, and netem-faults Linux containers. Use targeting, the tc helper, and CI teardown so the qdisc does not outlive the job.',
  date: '2026-09-24',
  category: 'Guide',
  content: `
# Pumba Docker Chaos Testing: Network Fault Injection That Cleans Up

Pumba is a chaos testing CLI for Linux containers. The current GitHub release is 1.2.1, published on 23 August 2026. That tag is a lint-config bump over 1.2.0: the repository VERSION file on the tag still reads 1.2.0, and the chaos commands did not change in that delta. The tool talks to Docker by default, and the same binary can target containerd or rootful Podman. It kills, stops, pauses, removes, and restarts containers, execs a command, stresses CPU, memory, and I/O, and injects network faults. Egress faults go through Linux \`tc\` netem. Ingress loss goes through iptables. Those are different commands, different directions, and different numeric scales.

For a Docker host, run Pumba on the same kernel as the containers you want to hurt. Select targets by exact name, by an \`re2:\` expression, or by labels. Pass \`--duration\` on every netem, iptables, and pause run, and keep that duration shorter than \`--interval\` when you repeat the fault. When the run ends, confirm the Pumba-owned root qdisc handle \`504d:\` is gone before the next test reuses the container. A cancelled job that SIGKILLs Pumba skips that cleanup. The container keeps the delay, and the next suite looks flaky for a reason that is no longer in the test log.

Network emulation changes packets leaving the container. It does not, by itself, drop packets arriving at the container. Slowing a dependency means deciding which side of the connection you are delaying, then naming that side. Kubernetes 1.24 and newer removed the Docker shim, so a DaemonSet that only mounts \`/var/run/docker.sock\` will not see pods on a containerd node. Use \`--runtime containerd\` with namespace \`k8s.io\`, or move the experiment to a controller that schedules faults as Kubernetes objects. Windows binaries are not published and are not planned. macOS binaries exist only to drive a Linux VM such as Colima or a Podman machine.

## The 1.2.1 command set, and which runtime accepts it

Pumba is not a retired side project and it has not been renamed. The primary image is \`ghcr.io/alexei-led/pumba\`, built for linux/amd64 and linux/arm64. The README marks Docker Hub \`alexeiled/pumba\` as deprecated. The deployment guide's older Docker Hub example, and the checked-in \`deploy/pumba_kube.yml\`, still reference \`gaiaadm/pumba\`. Copy the manifest and you pull a deprecated image that mounts the Docker socket. Prefer the GHCR image and the runtime flags in the current user guide.

Prerequisites from that guide: Docker 18.06.0 or later, containerd 2.0 or later, or Podman 5.x with a Docker-compatible socket. Lifecycle commands work against rootless Podman. \`netem\`, \`iptables\`, and \`stress\` do not: Pumba fails fast and points at \`podman machine set --rootful\` on macOS or the rootful \`podman.socket\` unit on Linux. Every chaos action uses Linux primitives (network namespaces, cgroups, \`tc\`, iptables), so the process must run on the same kernel as the target. On a Mac, that means inside the VM, not as a host-side binary hoping the socket will forward netns operations.

| Runtime | Default socket | Network and stress | Practical limit |
| --- | --- | --- | --- |
| Docker | \`/var/run/docker.sock\` | Helper container or tools inside the target | Default. Socket access is enough for the API client |
| containerd | \`/run/containerd/containerd.sock\` | Needs root. Sidecar for images without \`tc\` | Namespace \`k8s.io\` for Kubernetes, \`moby\` for Docker-managed, \`default\` for plain containerd |
| Podman | auto-detected, rootful \`/run/podman/podman.sock\` | Rootful only, stress always in a sidecar | Rootless socket is rejected for netem, iptables, and stress |

Global runtime flags sit before the subcommand. \`--runtime\` defaults to \`docker\`. \`--containerd-socket\` defaults to \`/run/containerd/containerd.sock\`. \`--containerd-namespace\` defaults to \`k8s.io\`. \`--podman-socket\` is optional: an empty value probes \`CONTAINER_HOST\`, \`PODMAN_SOCK\`, \`podman machine inspect\`, \`/run/podman/podman.sock\`, then \`$XDG_RUNTIME_DIR/podman/podman.sock\`.

\`pumba ps\` lists what the selected runtime can see. Run it before the first kill. If the name you expect is missing, the rest of the plan is aimed at the wrong engine.

The documented Linux amd64 binary install, and the image pull you should pin in a lab after you have read the release:

\`\`\`bash
curl -sL https://github.com/alexei-led/pumba/releases/latest/download/pumba_linux_amd64 -o pumba
chmod +x pumba
./pumba --log-level info ps

docker pull ghcr.io/alexei-led/pumba:latest
docker pull ghcr.io/alexei-led/pumba-alpine-nettools:latest
\`\`\`

The release page also publishes a linux/arm64 binary. The README curl example is amd64 only, so copy the arm64 asset name from the release you just verified rather than guessing the filename. Log levels are \`debug\`, \`info\`, \`warning\` (the default), \`error\`, \`fatal\`, and \`panic\`. \`--json\` prints those logs as JSON for Logstash or Splunk. Do not assume a field name the current docs do not list. \`--dry-run\` logs the planned action and does not perform it. \`--skip-error\` keeps an \`--interval\` loop going when a tick fails because the target is briefly gone.

## Names, RE2 filters, and labels are not the same selector

Exact names are space-separated arguments: \`pumba kill checkout-api payments\`. A pattern needs the \`re2:\` prefix and is a RE2 expression, not PCRE. Lookaheads and backreferences are not in the syntax the user guide points at. \`re2:^test\` matches names that start with \`test\`. \`re2:api\` matches any name that contains those three characters. Several selectors are OR'd. \`pumba kill "re2:^web-" database "re2:^api-"\` hits the regexes and the exact name \`database\`.

Labels are AND. \`pumba --label app=web --label env=staging kill\` only hits containers that carry both. \`--random\` (also \`-r\`) keeps a single container from the matched set. \`kill\` and \`exec\` also accept \`--limit\`. Global flags, including \`--label\`, \`--random\`, \`--interval\`, \`--dry-run\`, and \`--log-level\`, go before the subcommand name.

Two naming schemes surprise people who learned Pumba on \`docker run --name\`.

Compose prefixes the container unless you set \`container_name\`. A service called \`checkout-api\` in project \`shop\` is typically \`shop-checkout-api-1\`. \`pumba kill checkout-api\` matches nothing. \`re2:api\` matches that container and anything else with \`api\` in the name, including a helper you started for an earlier run. Set \`container_name\` for the experiment, and add an allowlist label so a broad regex cannot reach the Pumba container or the database you did not mean to pause.

On containerd, Kubernetes names resolve from labels in a fixed order: \`io.kubernetes.container.name\` becomes \`namespace/pod/container\`, then nerdctl's name, then \`com.docker.compose.service\`, then the container id. \`re2:^default/\` matches the \`default\` namespace. A pattern copied from Docker, such as \`re2:^checkout\`, matches nothing in that format.

\`kill\`, \`stop\`, and \`rm\` require at least one container argument (a name, a list, or an \`re2:\` pattern). Passing only \`--label\` works in the label examples for \`kill\`, but the netem examples always pass a container argument too. Pass both. If the label and the name disagree, you get a no-op you can see in a dry run instead of a fault applied to every container on the host.

The allowlist below is the pattern the CI script later in this article depends on. Without \`container_name\`, the Pumba argument \`checkout-api\` does not match the Compose-generated name.

\`\`\`yaml
services:
  checkout-api:
    image: nginx:alpine
    container_name: checkout-api
    labels:
      com.example.chaos: allow
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1/"]
      interval: 2s
      timeout: 2s
      retries: 10
  payments:
    image: nginx:alpine
    container_name: payments
    labels:
      com.example.chaos: allow
    depends_on:
      checkout-api:
        condition: service_healthy
\`\`\`

\`nginx:alpine\` is a stand-in so the commands run without your real image. BusyBox \`wget\` is what both the healthcheck and the later probe use. The chaos label is an application label you invent. It is not a Pumba built-in. The built-in self-protection label, used on the Pumba pod itself, is \`com.gaiaadm.pumba: "true"\`.

Preflight on a real host:

\`\`\`bash
docker compose up -d --wait
docker exec checkout-api ls /sys/class/net
pumba --dry-run --label com.example.chaos=allow \\
  netem --duration 90s --pull-image=false \\
  delay --time 300 --jitter 40 --distribution normal \\
  checkout-api
\`\`\`

\`ls /sys/class/net\` is deliberate. \`nginx:alpine\` often has no \`ip\` binary. If \`eth0\` is not in that listing, stop. \`--interface\` defaults to \`eth0\`. Host networking, some CNI plugins, and a container that shares another service's network namespace will not match that default, and netem will target an interface that is not there.

## Kill, stop, and pause do not fail the same way

\`kill\` sends a signal to the main process. The default is \`SIGKILL\`. \`pumba kill --signal SIGTERM checkout-api\` is the graceful variant. \`SIGKILL\` skips the application's own shutdown, so it is the right drill for "the process vanished" and the wrong drill for "the process was asked to drain".

\`stop\` sends \`SIGTERM\`, waits, then \`SIGKILL\`. The grace flag is \`--time\`, and the user guide's default is a 5 second grace. \`pumba stop --time 30 checkout-api\` waits 30 seconds. That number is seconds.

\`pause --duration 5s checkout-api\` freezes the container's processes through the runtime pause API and unpauses when the duration ends. The interfaces stay up. Peers can still send. Packets sit until the container runs again. A client timeout during pause proves the caller gave up. It does not prove a packet was dropped. If you need drops, use netem or iptables, not pause.

\`rm\` force-removes running containers and their volumes unless you pass \`--force=false --volumes=false\`. On containerd's \`moby\` namespace, remove kills the task but Docker can keep its own metadata. \`restart\` restarts the target. \`exec\` runs a command inside it. The default command is \`kill 1\`. A custom command is \`--command\` plus repeated \`--args\`, not a single shell string: \`pumba exec --command ls --args "-la" --args /etc "re2:^api"\`.

\`--interval 30s\` repeats the command. Units are \`ms\`, \`s\`, \`m\`, and \`h\`. For any command that also has \`--duration\`, the duration must be shorter than the interval. \`--interval 20s pause --duration 30s\` violates that rule. The loop would still be inside the pause when the next tick starts. \`--skip-error\` matters on shared CI hosts where the regex matches zero containers on some ticks because a job already tore the stack down.

People mix up the two \`--time\` flags constantly, especially when an agent pastes a snippet from the wrong subcommand. \`stop --time 30\` is a 30 second grace. \`netem delay --time 30\` is 30 milliseconds of egress latency, which is a rounding error on a local bridge and will not show up in a test that only asserts HTTP 200. The delay examples in the docs use \`3000\` when they want three seconds. Read the unit off the subcommand, not off the flag spelling.

\`kill\` with a wide \`re2:\` and \`--random\` on a Docker host that also runs the job's own build container is how a chaos smoke test deletes the runner's sibling. Dry-run, then an allowlist label, then a single exact name. Add \`--random\` only after \`pumba ps\` shows a set you are willing to lose one member of.

## Netem delay is egress only, and the qdisc handle is 504d:

\`netem\` uses Linux traffic control on outgoing packets. Pumba checks that the interface still has its default root qdisc and refuses to replace a foreign or stale one. It installs a qdisc it owns, handle \`504d:\`, keeps it for \`--duration\`, then removes it. Duration is required. The default interface is \`eth0\`. \`--tc-image\` defaults to \`ghcr.io/alexei-led/pumba-alpine-nettools:latest\`. \`--pull-image\` defaults to \`true\`, so every run tries to pull that helper unless you turn the flag off after a manual pull.

The helper container shares the target's network namespace and holds \`NET_ADMIN\`, so \`tc\` applies to the target's stack without baking iproute2 into the application image. A custom helper for netem must include \`sh\`, \`grep\`, and \`tc\`. Docker and Podman also need \`which\` and \`tail\` in that image. containerd needs \`sleep\`. The published Alpine and Debian nettools images include the full set, and both are multi-arch.

\`--target\` repeats. Each value is an IPv4 address, a CIDR, or a running container name or id. Names are resolved on every run, including each interval tick. A container on two networks contributes every IPv4 address as its own filter. IPv6 targets fail on purpose: the filter planner emits IPv4 rules only. An ambiguous name prefix is a hard error, not a silent first match.

That targeting model is the actual latency experiment. Delay on \`checkout-api\` slows packets leaving \`checkout-api\`. A GET from \`payments\` to \`checkout-api\` arrives as ingress, which this qdisc does not delay. The response leaves \`checkout-api\` and is delayed. One HTTP round trip grows by about the \`--time\` value, not by twice that value. To slow the request itself, put the delay on \`payments\` and pass \`--target checkout-api\`. To slow both directions, run two netem commands, one on each container. Stacking a second netem on an interface that already has a Pumba qdisc hits the foreign-qdisc refusal. Wait for the first duration to end, or use \`combine\` for two effects on one owned qdisc.

The failure mode that survives the job: Pumba is killed with \`SIGKILL\` after setup. Cleanup does not run. The target keeps a root qdisc whose handle is \`504d:\`. On a laptop this looks like "the API got slow and I do not know why". On a self-hosted runner that reuses the Docker daemon, the next job inherits the delay. Diagnosis has to happen while the target container still exists. Once the network namespace is gone, the qdisc is gone with it, and you have lost the evidence.

\`tc\` is usually not in the application image. Enter the target's network namespace from the host. \`nsenter\` is in util-linux. \`tc\` is in iproute2, which you install if the runner image omitted it. Only delete the qdisc when the show output contains \`504d:\`. Deleting \`root\` blindly on an interface you did not inspect will remove a queueing discipline that something else installed.

\`\`\`bash
sudo apt-get update
sudo apt-get install -y iproute2
pid=$(docker inspect -f '{{.State.Pid}}' checkout-api)
sudo nsenter -t "\${pid}" -n tc qdisc show dev eth0
# If, and only if, that output contains the Pumba handle 504d:, remove just that qdisc:
sudo nsenter -t "\${pid}" -n tc qdisc del dev eth0 root handle 504d:
\`\`\`

Prefer not to reach this snippet. \`docker stop\` sends a catchable signal and a grace period. \`docker kill\` without a signal is \`SIGKILL\` and is how the stale qdisc gets created. The supported automatic removal is still \`--duration\`. After any early stop, show the qdisc again before you trust the container.

minikube is a separate, documented dead end: the VM image lacks the \`sch_netem\` module, so \`pumba netem\` does not work there. A green \`docker pull\` does not prove the kernel can load netem. If \`tc qdisc show\` cannot attach netem even by hand, change the cluster, not the Pumba flags.

## One owned qdisc: delay, loss, corrupt, duplicate, rate, combine

Each single-effect netem subcommand is a different \`tc\` netem mode. \`--duration\` is on the parent \`netem\` command. Effect flags belong to the subcommand. Container selectors go last. \`combine\` needs a \`--\` before those selectors so a name is not parsed as another effect flag.

| Subcommand | What leaves the container | Flags the user guide documents |
| --- | --- | --- |
| \`delay\` | Extra latency | \`--time\` ms, \`--jitter\` ms, \`--correlation\` percent, \`--distribution\` uniform, normal, pareto, or paretonormal |
| \`loss\` | Independent drops | \`--percent\` 0-100, \`--correlation\` |
| \`loss-state\` | 4-state Markov bursts | \`--p13\`, \`--p31\`, \`--p32\`, \`--p23\`, \`--p14\` |
| \`loss-gemodel\` | Gilbert-Elliot good/bad channel | \`--pg\`, \`--pb\`, \`--one-h\`, \`--one-k\` |
| \`duplicate\` | Extra copies | \`--percent\`, \`--correlation\` |
| \`corrupt\` | Bit errors | \`--percent\`, \`--correlation\` |
| \`rate\` | Bandwidth cap | \`--rate\` such as \`100kbit\` or \`1mbit\`, \`--packetoverhead\`, \`--cellsize\`, \`--celloverhead\` |
| \`combine\` | Two or more of delay, loss, corrupt, duplicate, rate on one qdisc | Namespaced flags such as \`--delay-time\`, \`--loss-percent\`, \`--rate-value\` |

Independent \`loss --percent\` sprinkles drops. Retries often succeed on the next packet, so a test can look healthy while still "having chaos". \`loss-gemodel\` alternates a good state and a bad state. The documented sample \`--pg 5 --pb 90\` is a sample, not a calibration of your network. Use it to see whether the client collapses during a bad period, then change the probabilities on purpose. \`loss-state\` is the four-state burst model. Stateful loss is not available inside \`combine\`. If you need a burst plus a delay, run them as the documented standalone commands on a schedule that does not overlap on the same interface, or accept that one owned qdisc is the combine set only.

\`duplicate\` and \`corrupt\` catch clients that treat TCP as a reliable pipe and still break when a proxied UDP hop, or a buggy user-space framer, delivers two copies or a bad checksum. \`rate\` is how you emulate a small pipe without adding a fixed delay. A 1 mbit cap with the default delay of zero fails differently from a 300 ms delay on an unlimited pipe: the first fills buffers, the second shifts deadlines. Assert the failure you meant to cause. A single status code of 200 does not tell you which of those happened.

\`\`\`bash
pumba netem --duration 5m --interface eth0 --target payments \\
  delay --time 300 --jitter 40 --correlation 20 --distribution normal \\
  checkout-api

pumba netem --duration 5m combine \\
  --delay --delay-time 100 --delay-jitter 20 \\
  --loss --loss-percent 5 \\
  --rate --rate-value 1mbit \\
  -- checkout-api
\`\`\`

The first command delays egress from \`checkout-api\` only toward the addresses of \`payments\`. Other peers stay fast, which is what you want when the same container also serves a healthcheck from localhost or from the probe sidecar. The second command puts 100 ms of delay, 5 percent independent loss, and a 1 mbit cap on one qdisc for every peer. \`combine\` requires at least two effect switches. One switch is not a shorter way to spell \`delay\`.

Port filters are \`--egress-port\` and \`--ingress-port\` on the parent \`netem\` command (comma-separated). They are how you corrupt database traffic without corrupting the health port. Example shape from the network guide: \`--egress-port 5432\` together with \`--target\` set to the database address, then \`corrupt --percent 5\`. Keep the percent small. A corrupt rate high enough to black-hole the TCP session teaches you less than a rate that surfaces checksum and retry bugs.

## Ingress loss is an iptables probability, not a netem percent

iptables in Pumba filters packets arriving at the container. The subcommand is \`loss\`. \`--probability\` runs from 0.0 to 1.0. \`--mode\` is \`random\` (the default) or \`nth\`. \`nth\` uses \`--every\` and \`--packet\`. Parent flags include \`--protocol\` (\`any\`, \`tcp\`, \`udp\`, \`icmp\`), \`--source\`, \`--destination\`, \`--src-port\`, and \`--dst-port\`. \`--iptables-image\` defaults to the same Alpine nettools image as \`--tc-image\`. \`--pull-image\` again defaults to true.

\`--probability 0.1\` drops about one incoming packet in ten. \`netem loss --percent 10\` drops about one outgoing packet in ten. The digits match. The direction and the flag do not. Agents paste \`loss --percent 0.1\` under \`iptables\` or \`loss --probability 10\` under \`netem\` and then conclude the tool is a no-op. Dry-run will not catch a probability that is technically in range but aimed at the wrong direction. A probe will. Send traffic you can count, from a peer that is not in the target network namespace.

Asymmetric conditions are two processes. The shell background operator is what the network guide uses. Give both the same duration so one side does not outlive the other. Do not start a second netem against an interface that already carries \`504d:\`.

\`\`\`bash
pumba netem --duration 5m --tc-image ghcr.io/alexei-led/pumba-alpine-nettools:latest \\
  delay --time 500 --jitter 50 checkout-api &

pumba iptables --duration 5m --protocol tcp --dst-port 80 \\
  --iptables-image ghcr.io/alexei-led/pumba-alpine-nettools:latest \\
  loss --probability 0.1 checkout-api &
\`\`\`

Outgoing responses pick up 500 ms plus jitter. Incoming TCP to port 80 loses about 10 percent of packets. That is a degraded link, not a partition. A partition is "this peer is gone", which you prove by showing timeouts in both directions and by showing that a third peer still works. Probabilistic loss will not give you a clean split-brain story. For drills whose pass condition is a fully cut link, use a [network partition simulation](/blog/chaos-testing-network-partition-simulation) instead of turning the probability up until the test happens to fail.

\`--source\` on iptables is an address or CIDR in the current docs' examples, not a container name. \`--target\` on netem is the flag that accepts a container name. Mixing those up filters nothing and returns success. Resolve the peer IP first (\`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' payments\`) and pass that string, or stay on netem \`--target\` when you only need to shape egress.

Overlapping rules on one container are the other silent bug. An iptables loss rule and a second iptables loss rule for the same protocol are not a single probability. Pumba's own guidance is to avoid conflicting rules on the same container. One ingress command and one egress command is the pair you can explain to the next person who reads the log.

## The helper image, pull behavior, and distroless targets

Distroless and scratch application images do not contain \`tc\` or iptables. That is fine. The helper is the supported path, and it is already the default \`--tc-image\`. You do not need \`--tc-image\` on the command line unless you are pinning a tag or switching to \`ghcr.io/alexei-led/pumba-debian-nettools:latest\`.

What you do need in CI is control of the pull. \`--pull-image\` defaults to true. A job whose runners cannot reach ghcr.io fails at chaos setup after the tests compiled. Pull both images in a step that is allowed to use the network, then pass \`--pull-image=false\`. Pinning \`:latest\` is still a moving target. After you have verified a release, retag the digest you pulled into the registry your runners actually use, and point \`--tc-image\` at that copy. The docs do not promise an immutable tag layout beyond what the release publishes, so the digest is the pin that will not surprise you.

Pull failures look like a missing binary inside the target. Read the Pumba log before you rebuild the app image. \`--log-level debug\` shows the helper creation. If the helper starts and \`tc\` then returns a netlink error, you are past the image problem and into kernel modules, capabilities, or an interface name.

\`NET_ADMIN\` belongs on the helper, which Pumba requests when it creates that container. The Pumba process itself needs the Docker socket (or the containerd or Podman socket) so it can create the helper. The Kubernetes Docker-mode example also adds \`NET_ADMIN\` on the Pumba container. Match the manifest style for the runtime you picked, and do not add \`privileged: true\` on a Docker-socket DaemonSet just because the containerd example has it. Privileged plus a Docker socket is the node.

On containerd, direct exec of \`tc\` is the default, and the target must then contain \`sh\` and \`tc\`. \`--tc-image\` opts into the sidecar instead. The containerd stress path is the opposite of the Docker stress path: stress execs \`stress-ng\` inside the target and ignores \`--stress-image\` and \`--inject-cgroup\`. Read the runtime section before you copy a Docker stress command onto a k3s node.

## Running the Pumba container without letting it kill itself

The image entrypoint is already \`pumba\`. Arguments you pass to \`docker run\` are Pumba arguments, not a shell. Mount the socket. Do not mount it from a Windows or macOS path and expect a Unix socket: the deployment guide says to use \`--host\` against the daemon address when there is no socket to bind. A Linux CI runner has the socket.

\`\`\`bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
  ghcr.io/alexei-led/pumba:latest \\
  --interval 30s --random --log-level info --skip-error \\
  kill --signal SIGKILL "re2:^shop-checkout-"
\`\`\`

That container can see every other container the daemon can see, including itself if you name things badly. The Kubernetes manifests put \`com.gaiaadm.pumba: "true"\` on the pod so a broad kill does not reap the chaos process. On plain Docker, prefer an allowlist label on the targets over a regex that matches \`pumba\`. Also keep the chaos container's name free of the product prefix you are killing. \`re2:^test\` will match \`test-pumba\` if that is what you called the helper.

Remote daemons use TLS flags from the user guide: \`--tls\`, \`--tlsverify\`, \`--tlscacert\`, \`--tlscert\`, \`--tlskey\`, and \`--host tcp://docker.ci.internal:2376\`. Verify with \`--dry-run\` before \`kill\`. A TLS miss and a regex miss both produce an empty result if you are not reading logs. \`--json --log-level info\` makes that visible in the job output.

Slack is optional: \`--slackhook\` and \`--slackchannel\` (default \`#pumba\`). Treat the webhook as a secret. A chaos event in a shared channel is useful. The same URL in a committed workflow file is not.

OpenShift is the same DaemonSet idea. The deployment guide points at \`deploy/pumba_openshift.yml\` and \`oc create -f\`, with \`runAsUser: 0\` so the process can use the socket. Confirm the file in the release you deploy. Do not assume the GHCR image name was backported into older copies of that manifest.

## A DaemonSet on containerd is not a Chaos Mesh experiment

Pumba on Kubernetes is a node agent. A DaemonSet runs one (or more) Pumba containers per selected node. Each one uses the local runtime socket. It does not watch Chaos custom resources, and it does not participate in a cluster workflow engine. That is the right shape when you want \`tc\` on a few pods for a bounded drill. It is the wrong shape when you want a reviewed schedule, a namespace-safe RBAC story, and pod selectors stored in etcd.

The published Docker-socket DaemonSet is the legacy path. It still shows pause plus a normal-distribution delay, \`NET_ADMIN\`, tiny CPU and memory limits, and the \`com.gaiaadm.pumba\` label. Useful as a flag reference. Wrong as a drop-in on a current cluster: Kubernetes 1.24 removed the dockershim, and the pods you want are containerd tasks in namespace \`k8s.io\`. The deployment guide's containerd DaemonSet is the one to start from. It sets \`hostPID: true\` so a sidecar can share the target network namespace, runs privileged, mounts \`/run/containerd/containerd.sock\`, and passes \`--tc-image\`.

Label filters use the labels the kubelet already wrote on the container, not a Kubernetes label selector:

| Container label | Example value | What it narrows |
| --- | --- | --- |
| \`io.kubernetes.pod.namespace\` | \`shop\` | One namespace on that node |
| \`io.kubernetes.pod.name\` | \`checkout-api-6b8f7d9c4-abcde\` | One pod |
| \`io.kubernetes.container.name\` | \`app\` | One container inside the pod |

\`--label io.kubernetes.pod.namespace=shop\` is AND-combined with any other \`--label\`. It is not a promise about pods on other nodes. A DaemonSet without a node selector faults every node that schedules it. The deployment guide shows sample node labels for an EKS node group (\`alpha.eksctl.io/nodegroup-name\`) and a GKE node pool (\`cloud.google.com/gke-nodepool\`). Use a label \`kubectl get nodes --show-labels\` actually prints. A copied eksctl label on a kubeadm lab matches zero nodes, and the DaemonSet sits Pending while everyone stares at Pumba flags.

The socket is the credential. The manifests do not ship a ClusterRole, because listing pods through the Kubernetes API is not how these examples find targets. A "forbidden" from the API server means some other component. A "permission denied" on \`/run/containerd/containerd.sock\` means this one. The network guide also says to check the service account's RBAC. Do that if you added API calls of your own. Do not let it distract you from the mount.

Podman on a Linux Kubernetes host is a third socket (\`/run/podman/podman.sock\`), rootful only, with \`/proc\` mounted from the host and \`hostPID: true\` so cgroup paths resolve. The host's cgroup namespace is required because Podman's default private cgroup namespace hides ancestry from inside the container. None of that applies to Docker Desktop's embedded engine.

When the drill grows past "this node, this pod, this qdisc", stop stretching the DaemonSet. [Chaos Mesh](/blog/chaos-mesh-kubernetes-testing-guide) is the Kubernetes-native controller path: faults as objects, selectors the API understands, and a life cycle that does not depend on a privileged pod holding the runtime socket open for a hand-written \`args:\` list. Pumba remains the right tool on a single Docker host, in Compose CI, and as a node-local netem injector when you already accept the DaemonSet's privileges.

Stress on Kubernetes is documented separately and works without \`SYS_ADMIN\` when Pumba can resolve the pod cgroup through the Docker API. On a containerd runtime that path is not the same: the stress image flags are ignored and \`stress-ng\` must already be in the target image. Do not debug a containerd stress miss by adding \`--inject-cgroup\`. The flag is skipped there.

## A GitHub Actions job that proves the delay, then tears it down

\`netem\` blocks until \`--duration\` elapses when you run it in the foreground. A workflow that runs Pumba as one step and the test as the next step is testing the recovery, not the fault. The step log looks perfect. The qdisc is already gone. Start Pumba detached, probe while the handle \`504d:\` is present, then stop Pumba with a catchable signal and poll until the handle disappears.

The numbers below are test parameters, not a measured SLO and not a field study. The injected one-way delay is 300 ms. The probe floor is 250 ms, under that injection, so a few milliseconds of bridge overhead cannot fake a pass, and a missing qdisc cannot pass either. Three samples is the script's loop count, not a statistical claim.

The script assumes \`ubuntu-latest\` or any Linux runner where \`sudo\` is passwordless, GNU \`date\` supports \`%s%3N\`, and \`docker compose\` is the v2 plugin. It writes \`logs/qdisc-during.txt\`, \`logs/qdisc-after.txt\`, and \`logs/latency-ms.txt\`.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "\${root}"
mkdir -p logs

sudo apt-get update
sudo apt-get install -y iproute2

docker pull ghcr.io/alexei-led/pumba:latest
docker pull ghcr.io/alexei-led/pumba-alpine-nettools:latest
docker compose up -d --wait

if ! docker exec checkout-api ls /sys/class/net | grep -qx eth0; then
  echo "checkout-api has no eth0; set --interface to the real name" >&2
  exit 1
fi

cleaned=0
cleanup() {
  if [ "\${cleaned}" -eq 1 ]; then
    return 0
  fi
  cleaned=1
  docker stop -t 20 pumba-delay >/dev/null 2>&1 || true
  docker rm -f pumba-delay >/dev/null 2>&1 || true
  docker compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  ghcr.io/alexei-led/pumba:latest \\
  --dry-run --log-level info --label com.example.chaos=allow \\
  netem --duration 90s --pull-image=false --interface eth0 \\
  delay --time 300 --jitter 40 --distribution normal \\
  checkout-api

docker run -d --name pumba-delay \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  ghcr.io/alexei-led/pumba:latest \\
  --log-level info --label com.example.chaos=allow \\
  netem --duration 90s --pull-image=false --interface eth0 \\
  delay --time 300 --jitter 40 --distribution normal \\
  checkout-api

sleep 5
pid=$(docker inspect -f '{{.State.Pid}}' checkout-api)
sudo nsenter -t "\${pid}" -n tc qdisc show dev eth0 > logs/qdisc-during.txt
if ! grep -q '504d:' logs/qdisc-during.txt; then
  echo "Pumba did not install its qdisc; see logs/qdisc-during.txt" >&2
  exit 1
fi

: > logs/latency-ms.txt
for _ in 1 2 3; do
  start=$(date +%s%3N)
  docker compose exec -T payments wget -qO- http://checkout-api/ >/dev/null
  end=$(date +%s%3N)
  echo $((end - start)) >> logs/latency-ms.txt
done

while read -r ms; do
  if [ "\${ms}" -lt 250 ]; then
    echo "probe \${ms}ms beat the 300ms injection; qdisc was not on the response path" >&2
    exit 1
  fi
done < logs/latency-ms.txt

docker stop -t 20 pumba-delay
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sudo nsenter -t "\${pid}" -n tc qdisc show dev eth0 > logs/qdisc-after.txt || true
  if ! grep -q '504d:' logs/qdisc-after.txt; then
    break
  fi
  sleep 1
done
if grep -q '504d:' logs/qdisc-after.txt; then
  echo "504d: survived docker stop; delete only that handle before the next job" >&2
  exit 1
fi
\`\`\`

The probe runs in \`payments\`, not inside \`checkout-api\`. A client that shares the target network namespace is on the wrong side of the qdisc and will "disprove" a delay that is real for every other peer. \`wget\` has to succeed and has to be slow. A connection refused fails the script because \`set -e\` is on. That is the side effect check: the service stayed up, the response path was delayed, and the qdisc did not leak.

Wire it as a dispatched workflow so it does not surprise every pull request. Artifact names cannot contain a slash. Upload the \`logs\` directory, including on failure, or the qdisc file dies with the runner.

\`\`\`yaml
name: checkout-delay
on:
  workflow_dispatch:
jobs:
  delay:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7
      - name: Inject delay and probe
        run: bash scripts/pumba-delay-check.sh
      - name: Upload qdisc and latency logs
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: pumba-qdisc-logs
          path: logs
\`\`\`

A self-hosted runner that skips \`docker compose down\` between jobs is where the stale \`504d:\` fault actually costs you. Call the same \`tc qdisc show\` at the start of the job. If the handle is already present, fail before you inject a second fault, and delete only \`504d:\`. Do not \`docker kill\` the Pumba container in a "cleanup" step. That is the signal the project documents as skipping removal.

Teams that want an agent to repeat this preflight, the allowlist label, the dry run, and the post-stop qdisc check, without rediscovering the flags, can install ready-made QA skills from qaskills.sh with the qaskills CLI. The script above is still the thing the pipeline runs. A skill that only shells out to \`pumba netem delay\` with no duration and no teardown will recreate the green-log failure this section is about.

The assertion shape, if you promote the logs into a unit check later, has to look at all three artifacts. Illustrative fixtures, not a benchmark:

\`\`\`javascript
import assert from 'node:assert/strict';

const during = 'qdisc netem 504d: root refcnt 2 limit 1000 delay 300ms';
const after = 'qdisc noqueue 0: root refcnt 2';
const samples = [340, 410, 365];

assert.ok(during.includes('504d:'), 'netem qdisc missing while probes ran');
assert.equal(after.includes('504d:'), false);
assert.ok(samples.length >= 3, 'expected three probes');
for (const ms of samples) {
  assert.equal(Number.isFinite(ms), true);
  assert.ok(ms >= 250, 'probe faster than the injected delay');
}
\`\`\`

Those three sample values are stand-ins for lines the shell script would have written. They are not timings from a lab run. The point of the snippet is the order: presence of the handle, then every sample above the floor, then absence of the handle. Checking only that Pumba's exit code was zero misses both a fault that never attached and a fault that never left.

## Stress sidecars and the systemd cgroup trap

\`pumba stress\` is not a network fault, but it is in the same binary and it fails in a way that looks like "the flag did nothing". The default \`--stress-image\` is \`ghcr.io/alexei-led/stress-ng:latest\`. \`--stressors\` must be passed with an equals sign: \`--stressors="--cpu 4 --timeout 60s"\`. The stress-ng \`--timeout\` should be less than or equal to Pumba's \`--duration\`. The image has to provide \`/stress-ng\`. \`--inject-cgroup\` also needs \`/cg-inject\`. The stress guide names tag \`0.20.01\`, released 27 February 2026, as the first tag that ships \`/cg-inject\`. Older cached \`:latest\` layers will not inject. Pull again, or pin that tag.

Default placement uses Docker's \`--cgroup-parent\`. With the cgroupfs driver the sidecar is a child of the target and shares its limits. With the systemd driver Docker will not nest under another container's scope, so the sidecar lands as a sibling in \`system.slice\` and does not inherit the target's limits. Dashboards then show the container as idle while the node is busy. \`--inject-cgroup\` writes the stress-ng pid into the target's cgroup so the OOM scope is shared. That is the mode to use when the question is "does this memory limit kill the process". It is the wrong mode when you only wanted background noise and cannot afford to OOM the app. No privileged bit and no capabilities are required for the sidecar. It does need \`--cgroupns=host\` and a read-write mount of \`/sys/fs/cgroup\`, which Pumba sets up.

Podman never execs stress into the target. \`--stress-image\` is required there, and rootless is rejected. containerd ignores the image and inject flags and runs \`stress-ng\` inside the target, so the application image must contain the binary. Three runtimes, three sentences, three different "nothing happened" bugs.

A recurring form that stays on the allowlist:

\`\`\`bash
pumba --interval 10m --label com.example.chaos=allow \\
  stress --duration 60s --inject-cgroup \\
  --stressors="--cpu 2 --timeout 60s" \\
  checkout-api
\`\`\`

Only use \`--inject-cgroup\` on Docker or Podman, and only after the stress image is new enough to contain \`/cg-inject\`. If the node cgroup driver is unknown, read it from \`docker info\` before you interpret a flat CPU graph as a broken flag.

## Choose host tc, Pumba, or a cluster controller

Hand-written \`tc\` on the host netns is reasonable when there is one interface and one engineer watching the terminal. It falls apart when the target is a container netns you would have to \`nsenter\` by pid, and when the pid changes every deploy. Pumba is that \`nsenter\` plus a deadline plus a container selector.

Pumba is the wrong daily driver when the fault must be reviewed as a pull request against the cluster, when you need a workflow of several faults with a single abort, or when the platform team will not grant a privileged DaemonSet. Put those experiments on a Kubernetes chaos controller. Keep Pumba for Compose, for a Docker CI service, and for a short-lived node drill with an explicit node selector.

Also skip Pumba when the bug is in HTTP, not in IP. A reset of one route, a slow upstream status, or a corrupted JSON body is easier to fake in a test proxy that speaks the application protocol. You will spend less time explaining qdiscs, and you will not leave \`504d:\` behind. Use Pumba when the production failure really was latency, loss, a pause, or a dead process, and the application bug only shows up under that condition.

Remote Docker over TLS, a Podman machine, and a containerd k3s node can all run the same \`delay --time\` flags. They cannot share a socket path or a privilege set. Write the runtime into the job name. A green "pumba" step that targeted the wrong engine is indistinguishable from a resilient system.

## Frequently Asked Questions

### Does Pumba run on Docker Desktop for Mac?

The macOS binary is only a client for a Linux VM. Chaos actions need the target's kernel: network namespaces, \`tc\`, iptables, cgroups. Docker Desktop runs containers inside a Linux VM, so Pumba has to run there too, or you run the Linux container image with the VM's Docker socket mounted the way that VM exposes it. The deployment guide's note for macOS and Windows is to pass \`--host\` when there is no Unix socket on the machine you are typing on. There is no Windows build, including for the WSL2 backend, and the project says it will not add one. Podman on a Mac is stricter: use a rootful machine and run Pumba inside that VM, because cgroup paths are read from the host view of \`/proc\`. A \`pumba\` process on the Mac host can list containers and still fail as soon as you ask for netem.

### Why is the container still slow after the job was cancelled?

Cancellation often SIGKILLs the process tree. The user guide states that a SIGKILL after netem setup skips cleanup, leaving the owned root qdisc, handle \`504d:\`, on the target interface. The next test reuses the container and inherits the delay. Inspect while the container is still running: \`tc qdisc show dev eth0\` inside its network namespace. If the handle is \`504d:\`, delete only that root qdisc. If the container is already gone, the namespace is gone and you will not see the evidence. Prevent the repeat by using \`--duration\`, stopping Pumba with \`docker stop\` rather than \`docker kill\`, and failing the job when \`504d:\` is still present after the grace period. A foreground \`netem\` step that finishes before the test step is a different bug: the slowness never overlapped the assertions at all.

### Is an iptables probability of 0.1 the same as 10 percent netem loss?

The fraction of packets is similar. Everything else differs. \`iptables loss --probability\` accepts 0.0 through 1.0 and drops incoming packets. \`netem loss --percent\` accepts 0 through 100 and drops outgoing packets. \`0.1\` on the netem percent flag is a tenth of one percent, which your probe will not notice. \`10\` on the iptables probability flag is outside the documented 0.0 to 1.0 range. Direction decides the HTTP story: delay or loss on the server shapes the response, delay or loss on the client shapes the request. \`--target\` can aim netem at one peer's IPv4 addresses. iptables uses \`--source\`, \`--destination\`, and port flags for the same idea. Neither command is a two-way partition. If the pass condition is "this peer is unreachable and others are not", a one-sided probability will not prove it.

### When should a Docker chaos test move to Chaos Mesh?

Move it when the system under test is a Kubernetes cluster and the fault needs an API object, a namespace boundary, and an abort that does not depend on someone shelling into a node. Pumba's DaemonSet is a privileged pod holding the containerd or Docker socket and a hand-built argument list. That is appropriate for a bounded node drill and for labs that already run Compose. It is a poor fit for a platform where every experiment must be reviewed and scheduled the same way deployments are. Also move, or rather step sideways to host \`tc\`, when you are on minikube and \`sch_netem\` is missing: switching controllers will not load a kernel module the VM never shipped. Stay on Pumba when the target is a single Docker daemon, the selector is a container name or label, and the cleanup you can automate is "duration elapsed, handle \`504d:\` absent".
`,
};
