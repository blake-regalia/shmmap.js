# shmmap 🐏

Native bindings for [mmap](https://en.wikipedia.org/wiki/Mmap) complemented with [POSIX shm](http://man7.org/linux/man-pages/man7/shm_overview.7.html) for creating (and safely destroying) actual shared memory segments for sharing large data between node.js processes beneath things like Buffer / Uint8Array.

```bash
$ npm install --save shmmap
```

## Example
In *parent.js*:
```js
const cp = require('child_process');
const shmmap = require('shmmap');

// create a 4 MiB buffer
let nl_test = 4 * 1024 * 1024;
let [s_key, at_test] = shmmap.create(nl_test);

// write some data to it
let nl_half = nl_test>>1;
for(let i_write=0; i_write<nl_half; i_write++) {
	at_test[i_write] = i_write % 255;;
}

// spawn another process
let u_proc = cp.fork(__dirname+'/child.js', [s_key, at_test.byteLength, nl_half]);

// wait for process to exit
u_proc.on('exit', () => {
    // count the sum
	let c_sum = 0;
	for(let i_read=0; i_read<nl_half; i_read++) {
		c_sum += at_test[i_read];
	}

    // output sum to console
	console.log('parent sum: '+c_sum);
	
	// sanity check that zero-th position has special value set
	console.log('parent 0: '+at_test[0]);
});
```

In *child.js*:
```js
const shmmap = require('shmmap');

// open shared memory segment
let at_shared = shmmap.read_write(process.argv[2], +process.argv[3]);

// count sum
let c_sum = 0;
let nl_half = +process.argv[4];
for(let i_read=0; i_read<nl_half; i_read++) {
	c_sum += at_shared[i_read];
}

// write a value to zero-th position
at_shared[0] = 100;

// output sum to console
console.log('child sum: '+c_sum);
```

#### Results

```
child sum: 2097152
parent sum: 2097251
parent 0: 100
```

As we can see, the 'child' successfully mutates the zero-th value in the buffer that is shared between the two processes.

## API

`shmmap.create(byteLength: uint)` -- creates a [Buffer](https://nodejs.org/api/buffer.html) with the given `byteLength` atop a new shared memory segment.
 - **returns** an Array of `[key: path, data: buffer]` -- where `key` is the string you would pass over IPC to another process to open the shared memory segment somewhere else.


`shmmap.read(key: path, byteLength: uint)` -- creates a [Buffer](https://nodejs.org/api/buffer.html) with the given `byteLength` atop an existing shared memory segment, in read-only mode.
 - **returns** the Buffer


`shmmap.read_write(key: path, byteLength: uint)` -- creates a [Buffer](https://nodejs.org/api/buffer.html) with the given `byteLength` atop an existing shared memory segment, in read-write mode.
 - **returns** the Buffer


`shmmap.release(key: path)` -- releases the current process' hold on the shared memory segment at `key`.
 - **returns** `undefined`
