	var device_shots = (function() {
		var devices = [],
			device_in_use,
			is_dragging = false,
			drag_timer;

		function $(selector) {
			return document.querySelectorAll(selector)[0];
		}

		function create_device(device) {
			// Update controls
			var option = document.createElement("option");
			option.value = device.id;
			option.innerHTML = device.name;
			$('#device-settings-type').appendChild(option);

			// Update device
			device = new Device(device);
			devices.push(device);
			device.svg.querySelector('.device-image').setAttribute("xlink:href", './img/background_default.svg');
		}

		function set_device(device_id) {
			var html, selected, obj, i;

			devices.forEach(function(obj) {
				obj.svg.querySelector('.device-image').setAttribute("xlink:href", './img/background_default.svg');
				if (obj.id === device_id) {
					device_in_use = obj;
					obj.active = true;
					obj.svg.setAttribute('class', 'active ' + obj.styles[obj.default_style][1]);
					obj.export_cache_size = obj.sizes[obj.default_size];
				} else {
					obj.active = false;
					obj.svg.setAttribute('class', '');
				}
			});

			// Update controls
			html = '';
			for (i = 0; i < device_in_use.styles.length; ++i) {
				obj = device_in_use.styles[i];
				selected = '';
				if (i === device_in_use.default_style) {
					selected = 'selected="selected"';
				}
				html += '<option value="' + obj[1] + '" ' + selected + '>' + obj[0] + '</option>';
			}
			$('#device-settings-style').innerHTML = html;

			html = '';
			for (i = 0; i < device_in_use.sizes.length; ++i) {
				obj = device_in_use.sizes[i];
				selected = '';
				if (i === device_in_use.default_size) {
					selected = 'selected="selected"';
				}
				html += '<option value="' + i + '" ' + selected + '>' + obj[0] + 'x' + obj[1] + '</option>';
			}
			$('#device-settings-size').innerHTML = html;

			cache_image();

		}

		var Device = function(options) {
			for (var a in options) {
				this[a] = options[a];
			}
			this.svg = $(this.id);
			this.image = $(this.id + ' .device-image');
			this.export_cache_cache = '';
			this.export_cache_size = [];
			this.active = false;
			this.svg.addEventListener('click', function() {
				$('#file-select-no-drag').click();
			}, false);
			return this;
		};


		function svg_to_image(svg, margin, callback) {
			// Change to blob to overcome data URI length restrictions in some browsers?
			var image, svgdata, dataURI;
			image = document.createElement("img");
			if (svg.outerHTML) {
				svgdata = svg.outerHTML;
			}else {
				var div = document.createElement("div");
				var clone = svg.cloneNode(true);
				div.appendChild(clone);
				svgdata = div.innerHTML;
			}
			dataURI = 'data:image/svg+xml,' + encodeURIComponent(svgdata);

			image.onload = function() {
				var canvas = document.createElement("canvas");
				canvas.width = device_in_use.export_cache_size[0] + (margin * 2);
				canvas.height = device_in_use.export_cache_size[1] + (margin * 2);
				canvas.getContext("2d").drawImage(image, margin, margin, device_in_use.export_cache_size[0], device_in_use.export_cache_size[1]);
				callback(canvas.toDataURL("image/png"));
			};
			image.src = dataURI;
		}

		function file_read_complete(e) {
			var image = document.createElement("img");
			devices.forEach(function(obj) {
				obj.svg.querySelector('.device-image').setAttribute("xlink:href", e.target.result);
			});
			image.onload = function() {
				var ratio = this.width / this.height,
					screen = device_in_use.svg.querySelector('.device-image'),
					perfect_ratio = screen.height / screen.width;
				if (Math.round(ratio * 1000) / 1000 !== perfect_ratio) {
					$('#messages').innerHTML = '<div class="message"><p><a href="javascript:;" class="close">close</a>Hey! The image you placed isn\'t a great shape for the device you\'ve selected. It\'ll still work - but it might look a bit strange.</p></div>';
				} else {
					$('#messages').innerHTML = '';
				}
			};
			image.src = e.target.result;
			cache_image();
		}

		function cache_image() {
			$('#export-form button').disabled = true;
			svg_to_image(device_in_use.svg, 50, function(dataURI) {
				$('#export-form button').disabled = false;
				$('#export-form button').removeAttribute("disabled");
				device_in_use.export_cache_cache = dataURI;
			});
			// Let's cache all images?
			//devices.forEach(function(obj){
			//	svg_to_image(obj.svg, 50, function(dataURI) {
			//		device_in_use.export_cache_cache = dataURI;
			//	});
			//});
		}

		function read_file(file) {
			var reader = new FileReader();
			reader.onload = file_read_complete;
			reader.readAsDataURL(file);
		}

		function handleFileSelect(e) {
			e.preventDefault();
			e.stopPropagation();
			is_dragging = false;
			document.body.classList.remove("dragging");
			var files = e.dataTransfer.files;
			if (files[0].type.match('image.*') && files.length === 1) {
				read_file(files[0]);
			}
		}

		function handleDragEnter(e) {
			e.stopPropagation();
			e.preventDefault();
			is_dragging = true;
		}

		function handleDragLeave(e) {
			e.stopPropagation();
			e.preventDefault();
			is_dragging = false;
			clearTimeout(drag_timer);
			drag_timer = setTimeout(function() {
				if (!is_dragging) {
					document.body.classList.remove("dragging");
				}
			}, 200);
		}

		function handleDragOver(e) {
			e.preventDefault();
			e.stopPropagation();
			var files = e.dataTransfer.items;
			var error = false;
			is_dragging = true;
			if (!files[0].type.match('image.*') || files.length !== 1) {
				error = true;
			}
			if (error) {
				document.body.classList.add('dragging', 'files-not-ok');
				e.dataTransfer.dropEffect = "none";
			} else {
				document.body.setAttribute("class", 'dragging', 'files-ok');
				e.dataTransfer.dropEffect = "move";
			}
		}

		$('#device-settings-style').addEventListener("change", function() {
			var phone_style = $('#device-settings-style').options[$('#device-settings-style').selectedIndex].value;
			device_in_use.svg.setAttribute('class', 'active ' + phone_style);
			cache_image();
		}, true);

		$('#device-settings-size').addEventListener("change", function() {
			var phone_size = $('#device-settings-size').options[$('#device-settings-size').selectedIndex].value;
			device_in_use.export_cache_size = device_in_use.sizes[phone_size];
			cache_image();
		}, true);

		$('#device-settings-type').addEventListener("change", function() {
			var device_type = $('#device-settings-type').options[$('#device-settings-type').selectedIndex].value;
			set_device(device_type);
			cache_image();
		}, true);

		document.addEventListener("dragenter", handleDragEnter, false);
		document.addEventListener("dragover", handleDragOver, false);
		document.addEventListener('dragleave', handleDragLeave, false);
		document.addEventListener('drop', handleFileSelect, false);

		$('#file-select-no-drag').addEventListener('change', function() {
			var files = $('#file-select-no-drag').files;
			if (files[0].type.match('image.*') && files.length === 1) {
				read_file(files[0]);
			}
		});

		$('#device-settings-form').addEventListener('submit', function(e) {
			e.preventDefault();
		}, true);

		$('#export-form').addEventListener('submit', function(e) {
			e.preventDefault();
		}, true);

		$('#messages').addEventListener('click', function(e) {
			if (e.target.classList.contains('close')) {
				this.innerHTML = "";
			}
		});

		document.addEventListener('click', function(e) {
			if ($('#device-settings') === e.target.parentNode && e.target.tagName === 'A') {
				if ($('#device-settings-form').classList.contains('open')) {
					$('#device-settings-form').classList.remove('open');
				} else {
					$('#device-settings-form').classList.add('open');
				}
			} else {
				var descendant = false;
				var x = e.target.parentNode;
				while (x = x.parentNode) {
					if (x === $('#device-settings')) {
						descendant = true;
					}
				}
				if (!descendant) {
					$('#device-settings-form').classList.remove('open');
				}
			}
		});

		$('#export-form').addEventListener('click', function() {
			// Image is cached to prevent pop-up blockers
			if ($('#export-form button').disabled !== true) {
				window.open(device_in_use.export_cache_cache);
			}
		});

		return {
			create_device: create_device,
			set_device: set_device
		};

	})();



	var device_list = [{
		'name': 'iPhone 4',
		'id': '#device-iphone',
		'styles': [
			['Realistic dark', 'realistic dark'],
			['Realistic light', 'realistic light'],
			['Lineart light', 'lineart light'],
			['Lineart dark', 'lineart dark'],
			['Wireframe light', 'wireframe light'],
			['Wireframe dark', 'wireframe dark'],
			['Simple dark', 'simple dark'],
			['Simple light', 'simple light']
		],
		'default_style': 0,
		'sizes': [
			[100, 200],
			[400, 800],
			[500, 1000],
			[600, 1200]
		],
		'default_size': 2
	}, {
		'name': 'Galaxy',
		'id': '#device-galaxy',
		'styles': [
			['Realistic dark', 'realistic dark'],
			['Realistic light', 'realistic light'],
			['Lineart light', 'lineart light'],
			['Lineart dark', 'lineart dark'],
			['Wireframe light', 'wireframe light'],
			['Wireframe dark', 'wireframe dark'],
			['Simple dark', 'simple dark'],
			['Simple light', 'simple light']
		],
		'default_style': 0,
		'sizes': [
			[100, 200],
			[400, 800],
			[500, 1000],
			[600, 1200]
		],
		'default_size': 2
	}, {
		'name': 'iPad',
		'id': '#device-ipad',
		'styles': [
			['Dark', 'dark'],
			['Light', 'light'],
			['Wireframe dark', 'wireframe dark'],
			['Wireframe light', 'wireframe light'],
			['Lineart dark', 'lineart dark'],
			['Lineart light', 'lineart light']
		],
		'default_style': 0,
		'sizes': [
			[200, 150],
			[400, 300],
			[800, 600],
			[1040, 780],
			[1200, 900]
		],
		'default_size': 3
	}, {
		'name': 'Browser',
		'id': '#device-browser',
		'styles': [
			['Default', 'default']
		],
		'default_style': 0,
		'sizes': [
			[200, 150],
			[400, 300],
			[800, 600],
			[1040, 780],
			[1200, 900]
		],
		'default_size': 3
	}];


	//ToDo: add blob test maybe use modernizer?
	var supported = (window.File && window.FileList && window.FileReader);
	if (!supported) {
		document.getElementById('device').outerHTML = '<a href="http://browsehappy.com/"><img src="./img/cracked.png"></a>';
		document.getElementById('messages').innerHTML = '<div class="message"><span>Sorry :(</span><p>Your web browser is not as good as it could be. To use Device Shots you will need to upgrade. Visit <a href="http://browsehappy.com/">http://browsehappy.com/</a> to find out how.</p></div>';
	} else {

		device_list.forEach(function(device) {
			device_shots.create_device(device);
		});
		device_shots.set_device(device_list[0].id);

	}
