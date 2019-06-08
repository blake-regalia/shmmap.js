const fs = require('fs');
const mmap = require('mmap-io');

const shm = require('./build/Release/shmmap.node');

// mmap file path
let s_prefix = '/lw';

// process-unique key
let i_key = Math.floor(Math.random()*1e12);

// hash of fds created by process
const h_creates = {};

// hash of fds accessed by process
const h_attach = {};

const self = module.exports = {
	// create new region
	create(nb_buffer) {
		// settle on key
		let s_key = s_prefix+(i_key++).toString('16');

		// open mmap region
		let i_fd = shm.open(s_key, shm.O_CREAT | shm.O_EXCL | shm.O_RDWR, 0o666);

		// resize to buffer target
		shm.resize(i_fd, nb_buffer);

		// save fd to hash
		h_creates[s_key] = i_fd;

		// return tuple of [key, mmap_region]
		return [s_key, mmap.map(nb_buffer, mmap.PROT_READ | mmap.PROT_WRITE, mmap.MAP_SHARED, i_fd)];
	},

	// create read access to region
	read(s_key, nb_buffer) {
		// open mmap region
		let i_fd = shm.open(s_key, shm.O_RDONLY, 0o666);

		// save fd to hash
		h_attach[s_key] = i_fd;

		// return mmap_region
		return mmap.map(nb_buffer, mmap.PROT_READ, mmap.MAP_SHARED, i_fd);
	},

	// create read/write access to region
	read_write(s_key, nb_buffer) {
		// open mmap region
		let i_fd = shm.open(s_key, shm.O_RDWR, 0o666);

		// save fd to hash
		h_attach[s_key] = i_fd;

		// return mmap_region
		return mmap.map(nb_buffer, mmap.PROT_READ | mmap.PROT_WRITE, mmap.MAP_SHARED, i_fd);
	},

	// release region
	release(s_key) {
		// this process created mmap region
		if(h_creates[s_key]) {
			// unlink region
			shm.unlink(s_key);

			// close fd
			fs.closeSync(h_creates[s_key]);

			// delete from hash
			delete h_creates[s_key];
		}
		// this process accessed mmap region
		else if(h_attach[s_key]) {
			// close fd
			fs.closeSync(h_attach[s_key]);

			// delete from hash
			delete h_attach[s_key];
		}
	},

	transfer(dsb) {
		mmap.sync(dsb, true);
	},
};

process.on('exit', () => {
	// close all fds
	for(let s_key in h_creates) {
		self.release(s_key);
	}
	for(let s_key in h_attach) {
		self.release(s_key);
	}
});
