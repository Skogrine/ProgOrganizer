const config = {
	// For configuration: https://github.com/ptkdev/ptkdev-logger?tab=readme-ov-file
	loggerOptions: {
		language: "en",
		colors: true,
		debug: true,
		info: true,
		warning: true,
		error: true,
		sponsor: true,
		write: true,
		type: "log",
		rotate: {
			size: "10M",
			encoding: "utf8",
		},
		path: {
			// remember: add string *.log to .gitignore
			debug_log: "./log/debug.log",
			error_log: "./log/errors.log",
		},
	},
	organizer: {
		java: {
			maven: "",
			gradle: "",
			native: "",
		},
		node: "",
	}
}

module.exports = { config };