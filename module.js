const cp = require('child_process');
const fs = require('fs');

const mmap = require('mmap-io');

const shm = require('./build/Release/shmmap.node');

let s_prefix = '/lw';
let i_key = Math.floor(Math.random()*1e12);

const h_creates = {};
const h_attach = {};

const self = module.exports = {
	create(nb_buffer) {
		let s_key = s_prefix+(i_key++).toString('16');
		let i_fd = shm.open(s_key, shm.O_CREAT | shm.O_EXCL | shm.O_RDWR, 0o666);
		shm.resize(i_fd, nb_buffer);
		h_creates[s_key] = i_fd;
		return [s_key, mmap.map(nb_buffer, mmap.PROT_READ | mmap.PROT_WRITE, mmap.MAP_SHARED, i_fd)];
	},

	read(s_key, nb_buffer) {
		// console.log('recovering read sector from '+s_key+' @'+nb_buffer);
	        let i_fd = shm.open(s_key, shm.O_RDONLY, 0o666);
                h_attach[s_key] = i_fd;
		return mmap.map(nb_buffer, mmap.PROT_READ, mmap.MAP_SHARED, i_fd);
	},

	read_write(s_key, nb_buffer) {
		// console.log('recovering read/write sector from '+s_key+' @'+nb_buffer);
		let i_fd = shm.open(s_key, shm.O_RDWR, 0o666);
                h_attach[s_key] = i_fd;
		return mmap.map(nb_buffer, mmap.PROT_READ | mmap.PROT_WRITE, mmap.MAP_SHARED, i_fd);
	},

	release(s_key) {
		if(h_creates[s_key]) {
			shm.unlink(s_key);
                        fs.close(h_creates[s_key]);
			delete h_creates[s_key];
		} else if (h_attach[s_key]) {
                        fs.close(h_attach[s_key]);
			delete h_attach[s_key];
                }
	},

	transfer(dsb) {
		mmap.sync(dsb, true);
	},

	create_shm(i_key, nb_buffer) {
		return shm.create(i_key, nb_buffer, true);
	},

	fetch_shm(i_key, nb_buffer) {
		return shm.create(i_key, nb_buffer);
	},
};

process.on('exit', () => {
	for(let s_key in h_creates) {
		self.release(s_key);
	}
	for(let s_key in h_attach) {
		self.release(s_key);
	}
});
