# /pathsync
In-memory syncing of paths using Node.js, Redis, and WebSockets that live streams to observables.

## Inspiration

This is inspired by Firebase Realtime Database, which offers full disk persistance but that is something that I didn't need or want to pay for.  Additionally, Firebase Realtime Database has had periodic [latency blips and issues with uptime](https://status.firebase.google.com/summary), so I wanted to host this myself. Thus, pathsync was born.

## Setup

Redis needs to be running. Requires [ioredis](luin/ioredis), [faye](faye/faye), and [express](expressjs/express).

`npm install ioredis faye express`

**Server-side:**
```javascript
import http from 'http';
import express from 'express';
import Redis from 'ioredis';
import faye from 'faye';
import PathSync from 'pathsync/server';

// Pathsync binds to an existing Express app
const app = express();
// Pathsync requires redis
const redis = new Redis();
// Pathsync uses faye for pub/sub
const bayeux = new faye.NodeAdapter({ mount: '/faye', timeout: 45 });
// Create server
const server = http.createServer(app);
bayeux.attach(server);
server.listen(8000);
// Initialize pathsync
const pathSync = new PathSync(bayeux.getClient(), redis);
// Add routes to Express app
pathSync.install(app);
```

**Client-side:**
```javascript
import Faye from 'faye/src/faye_browser';
import PathStream from 'pathsync/client';

// Streams use faye for pub/sub
const client = new Faye.Client('http://example.com/faye', { timeout: 120 });
// Initialize streams
const pathStream = new PathStream('http://example.com', client);
```

## Usage

Pathsync writes all data to Redis and streams changes live to observables. It can load any path anytime and handles race conditions that can occur between initial fetch and live updates.

### Items

Items are just JavaScript objects.

**Server-side:**
```javascript
let item = pathSync.item('/users/onyx');
// Set item
await item.set({ animal: 'dog' });
// Update item
await item.update({ likes: 'food' });
// Get item
let data = await item.get();
// { animal: 'dog', 'likes: 'food' }
await item.remove();
data = await item.get();
// {}
// Items can also be subscribed to when changed
let sub = item.subscribe(data => console.log(data));
sub.cancel();
```

**Client-side:**
```javascript
let stream = pathStream.item('/users/onyx');

stream.subscribe(data => {
  // Will stream initial data and all updates to this path
});

// Kill the stream
stream.destroy();
```
### Lists

Lists are just JavaScript arrays and stream updates when items are added and removed. Items in a list do not have their own paths.

**Server-side:**
```javascript
let list = pathSync.list('/colors');
// Add items to the list
await list.set([{ color: 'blue' }, { color: 'green' });
await list.add({ color: 'yellow' });
let items = await list.getAll();
for (let item of items) {
  console.log(item.props);
  // { color: 'blue' }
  // { color: 'green' }
  // { color: 'yellow' }
}
await list.remove({ color: 'green' });
await list.replace({ color: 'blue' }, { color: 'purple' });
items = await list.getAll();
for (let item of items) {
  console.log(item.props);
  // { color: 'purple' }
  // { color: 'yellow' }
}

// Can also remove an instance of an item
let item = await list.get({ color: 'yellow' });
console.log(item.props) // { color: 'yellow' }
// Removes item from list
await item.remove();
// Adds item back list
await item.add();
// Replace with another item
await item.replace({ color: 'blue' });
```

**Client-side:**
```javascript
let stream = pathStream.list('/colors');

let onValue = stream.subscribe('value', list => {
  // Streams the entire list on initial load and when items are added/removed
});

stream.subscribe('added', item => {
  // Streams new items added to the list
});

stream.subscribe('removed', item => {
  // Streams items that are removed from the list
});

// Stop the first subscription
onValue.dispose();

// Kill the stream (and all subs)
stream.destroy();
```

### Collections

Collections are just JavasScript maps that sync child items under a parent path.  Items in a collection have their own paths.

**Server-side:**
```javascript
  let collection = pathSync.collection('/my/diary');
  let item = await collection.add({ text: 'Hello' });
  console.log(item.props); // { text: 'Hello' }
  console.log(item.key); // Unique id (lexicographically ordered), e.g. -L3a-kn14j6nNWJPkOec
  console.log(item.path); // /my/diary/-L3a-kn14j6nNWJPkOec
  // Alternatively, you can set the item if the key is known
  await collection.set('entry1', { text: 'Hello' });

  // Items can be updated, or removed, and subscribed to
  let sub = item.subscribe(data => console.log(data));
  await item.update({ tag: 'fun' });
  item = await item.get();
  console.log(item.props); // { text: 'Hello', tag: 'fun' }
  await item.remove();
  sub.cancel();

  // Can also get all items from a collection
  let items = await collection.getAll();
  for (let item of items) {
    console.log(item.key, item.path, item.props);
  }

  // Or can get and and remove an item by key
  item = await items.get('-L3a-kn14j6nNWJPkOec');
  await items.remove('entry1');
```

**Client-side:**
```javascript
let stream = pathStream.collection('/my/diary');

stream.subscribe(data => {
  // Will stream initial data and all updates to this path
  for (let [key, item] of data) {
    console.log(item.key, item.path, item.props);
  }
});

// Kill the stream
stream.destroy();
```

## Running Tests

Requires Redis is running: `npm test`
