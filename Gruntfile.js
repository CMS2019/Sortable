'use strict';

module.exports = function (grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),  //读取整个package.json 到一个对象中

		version: {  //任务 version
			src: ['<%= pkg.exportName %>.js', 'bower.json']  //Sortable.js   ,bower.json
		},

		uglify: {  // 任务uglify
			options: { //生成的文件头部 信息
				banner: '/*! <%= pkg.exportName %> <%= pkg.version %> - <%= pkg.license %> | <%= pkg.repository.url %> */\n'
				///*! Sortable 0.1.5 - MIT | git://github.com/rubaxa/Sortable.git */
			},
			dist: {
				files: {
					  '<%= pkg.exportName %>.min.js': ['<%= pkg.exportName %>.js'] // 用源文件压缩 后的名字 xx.min.js
				}
			}
		}
	});


	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-version');
	grunt.loadNpmTasks('grunt-contrib-uglify');


	// Default task.
	grunt.registerTask('default', ['version', 'uglify']);
};
