{
	"targets": [
		{
			"target_name": "shmmap",
			"sources": [
				"src/memory.cpp"
			],
			"include_dirs": [
				"<!(node -e \"require('nan')\")"
			]
		}
	]
}