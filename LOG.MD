# Development log for the RTS Project

I've recently discovered that making project-specific logs works way better for me than big blog posts.

## 2022-09-28

### Beginnings

This is the first entry, but the project is already quite far. The first draft of the code took me just 5 days of development, so I'll summarize that
first.

The other project I was working on (private at the time of writing) used a very similar stack, but with Nakama in the backend. I hit
some snags with the design of that other game, though, and wanted something already designed to focus on the technology and delivery
side of things. I was sure I want to keep using R3F (react-three-fiber) client-side, but Nakama was unfortunately limited to WebSockets
only, which would be a big blocker for truly realtime games. I wanted to try WebRTC for quite some time, and found a [Geckos](https://geckos.io) library
(or rather, library pair) that looked very promising. I've decided to write my own backend from scratch this time.

The client is still completely static and can be served by any server. The backend has two main communication modes - HTTP API and the WebRTC
channels. The HTTP API is used for synchronous stuff such as joining games, while the realtime channel only serves updates. While Geckos has some
builtin tooling for authentication, for now I've simply decided to trust the clients to tell me who they are.

The server is able to run multiple matches at a time, running at a constant tickrate. Scheduling the ticks is very primitive right now, but works well
enough with just one game for testing.

### Gameplay

The game is supposed to be a run-of-the-mill RTS. I've started with just a couple units - a harvester, a main base and a fighting unit. I've been 
convinced to try ECS for this project, and so far it's been working quite well, actually. So far the components are fully static - i.e. don't introduce
any mutable state to the objects. This will need to change soon, as dynamic components are much more powerful in practice.

The units respect basic move and attack commands, as well as the follow command. The follow command simply checks whether a new route needs
to be found, basing on the target unit's movement. All commands utilize pathfinding with A* (that I wrote from scratch)
to route on a grid. The grid is constructed on the server from a PNG file. The units can occupy arbitrary (floating-point) locations, but will
path over nodes directly on the grid. This is something I want to improve upon at some point with any-angle pathfinding and path smoothing. I also wanted
the algorithm to be able to route different unit sizes, but it seems that this will be mostly impactful on collision avoidance. As for that, I have made
a simple BOID-like implementation that unfortunately ignores the terrain right now.

There's also a client-side interpolation mechanism that smoothens things out quite a bit.

### Visuals

I'm using simple cubes for now, but I've added direction indicators over them to show their bearing and state. I've added a light and shadows just for fun,
but had to disable them on the terrain because the voxel grid of the terrain receive them really poorly. Using the Three's spotlight camera helper was
quite invaluable in determining the proper spotlight location; this helped me to reduce the shadowmap size, or rather to maximize the use of the shadowmap
that I had to produce the best possible quality.

### Deployment and process

I've decided to use GH Actions for this project, and started out by simply publishing the zip artifacts. Since I've recently deployed my own Kubernetes
cluster, though, building docker images seemed to make much more sense. That's also when I discovered that routing the UDP traffic to the nodejs server
might be a bit more challenging. Geckos is able to limit the used port range, but that still didn't want to play nice with Docker's port forwarding, at
least on Mac. I've decided to keep using the non-dockerized server for development, and use host-network mode on the k8s for now. I've read about something
called `multus` that should make possible to do a "proper" network routing, but I'm happy with it as is for now.

### Next steps

I hope to make those posts a bit more often (and perhaps smaller). The first one is summing the last couple of weeks of work, so the next ones should be 
a bit more bite-sized.

My next milestone is being able to actually playtest the game with people. That will include 
- finishing the full client UI workflow (joining/leaving game, finishing game etc.)
- making sure that both players start with necessary units that are properly positioned
- adding resources and unit production since it's a bit moot without it
- deploying the client to the server somehow

... and fixing all other minor issues that might come up. As far as client deployment, I'm quite torn between 
- using an existing web server and simply mounting the client zip as a volume
- building it together with a web server (Nginx or Caddy)
- serving it directly from the backend app and bundling everything into one container

I'll choose whatever's the easiest and go with that, probably. After I do the above i want to do playtests with grayboxed visuals first, and then maybe
start working on the models and music a bit.

## 2022-09-28 - #2

I sat down during the evening to start working on the first playtest branch. I quickly cleaned up a lot of bugs, but when i got to unit production, i realized
that i really need to get myself out of the static components rabbit hole, since there's no good way to rely the information about the unit production capabilities
(and cooldown!) to the client. This presents a challenge - expanding the unit state with dynamic component state means that the update might get much bigger. I
should keep an eye on that, but in the meantime should be able to get away with sending everything everytime.

## 2022-09-30
The day started with realization that the whole setup with "lastUpdatePacket" and "serverState" is very finnicky. I'll need to address the reliable vs unreliable updates at some point, for now I've just added all components to the UnitUpdate and called it a day.

I've added the bottom view that is able to show both a single unit and a group of selected units. That was easy enough, i really love how quickly you can create ui with React.

I figure that for the first playthrough i can add crucial elements now - i have moving, attacking and production, i need harvesting and making new buildings now.

A couple of hours later I've also realized that it's a good time to refactor the movement part of the game's AI system. I had a lot of TODOs left in that code because I was struggling with making proper abstractions there. The follow, move and attack actions all seemed to have very
specific needs, and i couldn't put my finger on what a good entrypoint would be. With adding the Build action though it became much clearer;
what I needed to express was simply "move towards a given position", hiding the entire pathfinding complexity underneath that. This now means
that building is just "go to the place, then build" etc. I've also added a radius parameter to the move command to allow it to end quicker;
that's very useful for all sort of actions that define their own interaction ranges. Perhaps in the future i might replace it with some other
arrival predicate or similar. Either way, I'm well set up to add resources and harvesting.
