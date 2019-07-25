/**!
 * Sortable
 * @author	RubaXa   <trash@rubaxa.org>
 * @license MIT
 */

// 常见的立即执行函数  iife  ,一般在浏览器中运行,用于作用域隔离  
(function (factory){
	"use strict";

	if( typeof define === "function" && define.amd ){   //AMD 模式下运行 
		define("Sortable", [], factory);  //在amd模式下, 定义模块
	}
	else {											   // 浏览器普通状态下,Sortable类挂载到windows
		window["Sortable"] = factory();
	}
})(function (){
	"use strict";

	var
		  dragEl
		, ghostEl
		, rootEl
		, nextEl

		, lastEl
		, lastCSS

		, activeGroup

		, tapEvt
		, touchEvt

		, expando = 'Sortable' + (new Date).getTime()

		, win = window
		, document = win.document
		, parseInt = win.parseInt
		, _silent = false

		, _createEvent = function (event/**String*/, item/**HTMLElement*/){
			var evt = document.createEvent('Event');  //创建事件 ,返回一个Event事件对象 ,此Event是MouseEvents等事件的原型.
			evt.initEvent(event, true, true);  //初始化事件名为 event,  可以通过elem.dispatchEvent('event')触发  ,elem.addEventListener进行绑定
			evt.item = item;// html元素
			return evt;
		}

		, noop = function (){}
		, slice = [].slice

		, touchDragOverListeners = []
	;


	/**
	 * @class  Sortable
	 * @param  {HTMLElement}  el
	 * @param  {Object}  [options]
	 * @constructor
	 */
	function Sortable(el, options){  // 一个Sortable 构造函数
		this.el = el; // root element
		this.options = options = (options || {});


		// Defaults
		options.group = options.group || Math.random();
		options.handle = options.handle || null;
		options.draggable = options.draggable || el.children[0] && el.children[0].nodeName || 'li';// 要拖拽的元素
		options.ghostClass = options.ghostClass || 'sortable-ghost';  //拖拽还未放下时的 样式类

		options.onAdd = _bind(this, options.onAdd || noop);
		options.onUpdate = _bind(this, options.onUpdate || noop);
		options.onRemove = _bind(this, options.onRemove || noop);  //此上三个是 拖拽绑定的事件
		//_bind 不会把回调的this绑定到sortable实例,而是作为第二个参数穿进去

		el[expando] = options.group;


		// Bind all prevate methods   先忽略
		for( var fn in this ){
			if( fn.charAt(0) === '_' ){
				this[fn] = _bind(this, this[fn]);
			}
		}

		//原始dom事件  给最外层的拖拽容器
		// Bind events
		_on(el, 'add', options.onAdd);
		_on(el, 'update', options.onUpdate);
		_on(el, 'remove', options.onRemove);

		_on(el, 'mousedown', this._onTapStart);
		_on(el, 'touchstart', this._onTapStart);

		_on(el, 'dragover', this._onDragOver); // 在其中处理 拖拽影子的添加,移动
		_on(el, 'dragenter', this._onDragOver);

		touchDragOverListeners.push(this._onDragOver);  //单独又收集了一次
	}


	Sortable.prototype = {// 原型
		constructor: Sortable,


		_applyEffects: function (){
			_toggleClass(dragEl, this.options.ghostClass, true);
		},


		_onTapStart: function (evt/**TouchEvent*/){
			console.log('_onTapStart')
			var
				  touch = evt.touches && evt.touches[0]
				, target = (touch || evt).target //直接的item
				, options =  this.options
				, el = this.el  // 整个拖拽list
			;

			if( options.handle ){
				target = _closest(target, options.handle, el);
			}

			target = _closest(target, options.draggable, el);  // 算出拖拽的item是谁 ,因为可能是制定了 draggable特定类

			if( target && !dragEl && (target.parentNode === el) ){
				tapEvt = evt;
				target.draggable = true; //设置为可拖拽


				// Disable "draggable"
				_find(target, 'a', _disableDraggable);
				_find(target, 'img', _disableDraggable);


				if( touch ){
					// Touch device support
					tapEvt = {
						  target:  target
						, clientX: touch.clientX
						, clientY: touch.clientY
					};
					this._onDragStart(tapEvt, true);
					evt.preventDefault();
				}

				//此处监听的是 拖拽容器而非 item的
				debugger
				_on(this.el, 'dragstart', this._onDragStart);
				_on(this.el, 'dragend', this._onDrop);

				//  ,相当于文档一直作为拖拽接收方
				_on(document, 'dragover', _globalDragOver); //应该是事件冒泡到文档捕捉了这个事件,


				try {  //无关紧要
					if( document.selection ){
						document.selection.empty();
					} else {
						window.getSelection().removeAllRanges()
					}
				} catch (err){ }
			}
		},


		_emulateDragOver: function (){
			 console.log('_emulateDragOver')
			if( touchEvt ){
				_css(ghostEl, 'display', 'none');

				var
					  target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY)
					, parent = target
					, group = this.options.group
					, i = touchDragOverListeners.length
				;

				do {
					if( parent[expando] === group ){
						while( i-- ){
							touchDragOverListeners[i]({
								clientX: touchEvt.clientX,
								clientY: touchEvt.clientY,
								target: target,
								rootEl: parent
							});
						}
						break;
					}

					target = parent; // store last element
				}
				while( parent = parent.parentNode );

				_css(ghostEl, 'display', '');
			}
		},


		_onTouchMove: function (evt){
				 console.log('_onTouchMove')
			if( tapEvt ){
				var
					  touch = evt.touches[0]
					, dx = touch.clientX - tapEvt.clientX
					, dy = touch.clientY - tapEvt.clientY
				;

				touchEvt = touch;
				_css(ghostEl, 'webkitTransform', 'translate3d('+dx+'px,'+dy+'px,0)');
			}
		},


		_onDragStart: function (evt/**Event*/, isTouch){
						 console.log('_onDragStart')
			var
				  target = evt.target
				, dataTransfer = evt.dataTransfer  // 定位直接item ,与其携带的数据
			;

			rootEl = this.el;   // 拖拽容器
			dragEl = target;    // 拖拽的子item    //设置要被拖拽的子元素
			nextEl = target.nextSibling;   //其后节点
			activeGroup = this.options.group;  //所属组信息

			if( isTouch ){ //先不看 ,这是触摸逻辑
				var
					  rect = target.getBoundingClientRect()
					, css = _css(target)
					, ghostRect
				;
				console.log('手机模式吧?')
				ghostEl = target.cloneNode(true);  

				_css(ghostEl, 'top', rect.top - parseInt(css.marginTop, 10));
				_css(ghostEl, 'left', rect.left - parseInt(css.marginLeft, 10));
				_css(ghostEl, 'width', rect.width);
				_css(ghostEl, 'height', rect.height);
				_css(ghostEl, 'opacity', '0.8');
				_css(ghostEl, 'position', 'fixed');
				_css(ghostEl, 'zIndex', '100000');

				rootEl.appendChild(ghostEl);

				// Fixing dimensions.
				ghostRect = ghostEl.getBoundingClientRect();
				_css(ghostEl, 'width', rect.width*2 - ghostRect.width);
				_css(ghostEl, 'height', rect.height*2 - ghostRect.height);

				// Bind touch events
				_on(document, 'touchmove', this._onTouchMove);
				// _on(document, 'touchend', this._onDrop);

				this._loopId = setInterval(this._emulateDragOver, 150);
			}
			else {
				dataTransfer.effectAllowed = 'move';   
				dataTransfer.setData('Text', target.textContent);

				_on(document, 'drop', this._onDrop); //给全局 设置一个 drop事件
			}

			setTimeout(this._applyEffects);
		},


		_onDragOver: function (evt){
				 // console.log('_onDragOver')
			if( !_silent && (activeGroup === this.options.group) && (evt.rootEl === void 0 || evt.rootEl === this.el) ){
				console.log('_onDragOver', evt)
				var
					  el = this.el// 拖拽容器
					, target = _closest(evt.target, this.options.draggable, el) //拖拽子元素中真正支持拖拽的元素
				;

				if( el.children.length === 0 || el.children[0] === ghostEl ){
					el.appendChild(dragEl); // 在start阶段就确定的 拖拽元素
				}
				else if( target && target !== dragEl && (target.parentNode[expando] !== void 0) ){
					if( lastEl !== target ){
						lastEl = target;
						lastCSS = _css(target)
					}


					var
						  rect = target.getBoundingClientRect()
						, width = rect.right - rect.left
						, height = rect.bottom - rect.top
						, floating = /left|right|inline/.test(lastCSS.cssFloat + lastCSS.display)
						, skew = (floating ? (evt.clientX - rect.left)/width : (evt.clientY - rect.top)/height) > .5
						, isWide = (target.offsetWidth > dragEl.offsetWidth)
						, isLong = (target.offsetHeight > dragEl.offsetHeight)
						, nextSibling = target.nextSibling
						, after
					;

					_silent = true;
					setTimeout(_unsilent, 30);

					if( floating ){
						after = (target.previousElementSibling === dragEl) && !isWide || (skew > .5) && isWide
					} else {
						after = (target.nextElementSibling !== dragEl) && !isLong || (skew > .5) && isLong;
					}

					if( after && !nextSibling ){
						el.appendChild(dragEl);
					} else {
						target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
					}
				}
			}
		},


		_onDrop: function (evt/**Event*/){
			clearInterval(this._loopId);//
 			console.log('_onDrop')
			// Unbind events
			_off(document, 'drop', this._onDrop);
			_off(document, 'dragover', _globalDragOver);  

			_off(this.el, 'dragend', this._onDrop);
			_off(this.el, 'dragstart', this._onDragStart);

			_off(document, 'touchmove', this._onTouchMove);
			_off(document, 'touchend', this._onDrop);

			debugger
			if( evt ){
				evt.preventDefault();
				evt.stopPropagation();

				if( ghostEl ){
					ghostEl.parentNode.removeChild(ghostEl);
				}

				if( dragEl ){
					_toggleClass(dragEl, this.options.ghostClass, false);

					if( !rootEl.contains(dragEl) ){
						// Remove event
						rootEl.dispatchEvent(_createEvent('remove', dragEl));

						// Add event
						dragEl.dispatchEvent(_createEvent('add', dragEl));
					}
					else if( dragEl.nextSibling !== nextEl ){
						// Update event
						dragEl.dispatchEvent(_createEvent('update', dragEl));
					}
				}

				// Set NULL
				rootEl =
				dragEl =
				ghostEl =
				nextEl =

				tapEvt =
				touchEvt =

				lastEl =
				lastCSS =

				activeGroup = null;
			}
		},


		destroy: function (){
			var el = this.el, options = this.options;

			_off(el, 'add', options.onAdd);
			_off(el, 'update', options.onUpdate);
			_off(el, 'remove', options.onRemove);

			_off(el, 'mousedown', this._onTapStart);
			_off(el, 'touchstart', this._onTapStart);

			_off(el, 'dragover', this._onDragOver);
			_off(el, 'dragenter', this._onDragOver);

			touchDragOverListeners.splice(touchDragOverListeners.indexOf(this._onDragOver), 1);

			this._onDrop();

			this.el = null;
		}
	};
// var sum = function(x, y) {
//    console.log(x, y);
// }
// var foo = Function.apply.bind(sum, null);   bind第二个参数固定了apply的第一个参数,且bind返回的是未调用的函数,所以foo([10,12])调用时,是触发了apply,
// 这时apply的第一个参数被固定住为null,后面的数组,经过他分解后立刻执行真正的函数,而这个真正的函数是bind时绑定的sum,相当于 直接调用sum(10,20)
// foo([10, 20]);   // 10, 20

// 第二种情况
// Function.bind.apply(…)    // 逻辑上,apply先行一步去执行bind,他先把bind的第一个参数给固定住,也就是this指向,也就是相当于他让bind执行了,只不过给bind制定了绑定对象
// ,而apply的参数也传给了bind,  上下文是其自身, 但是this作为第二个参数传入了
// https://blog.csdn.net/weixin_37787381/article/details/81509361

	function _bind(ctx, fn){  // this , 外部回调函数
		var args = slice.call(arguments, 2); //截取ctx,fn
		return	fn.bind ? fn.bind.apply(fn, [ctx].concat(args)) : function (){  //?第一个参数, 让fn预设了this,以及外部参数无需在传入额外的
			return fn.apply(ctx, args.concat(slice.call(arguments)));// 没看懂什么操作,感觉参数重复了啊 
		};// 
	}


	function _closest(el, selector, ctx){
		if( el ){
			ctx = ctx || document;
			selector = selector.split('.');

			var
				  tag = selector.shift().toUpperCase()
				, re = new RegExp('\\s('+selector.join('|')+')\\s', 'g')
			;

			do {
				if(
					   (tag === '' || el.nodeName == tag)
					&& (!selector.length || ((' '+el.className+' ').match(re) || []).length == selector.length)
				){
					return	el;
				}
			}
			while( el !== ctx && (el = el.parentNode) );
		}

		return	null;
	}


	function _globalDragOver(evt){
		console.log('_globalDragOver')
		evt.dataTransfer.dropEffect = 'move';
		evt.preventDefault();
	}


	function _on(el, event, fn){
		el.addEventListener(event, fn, false);
	}


	function _off(el, event, fn){
		el.removeEventListener(event, fn, false);
	}


	function _toggleClass(el, name, state){
		if( el ){
			if( el.classList ){
				el.classList[state ? 'add' : 'remove'](name);
			}
			else {
				var className = (' '+el.className+' ').replace(/\s+/g, ' ').replace(' '+name+' ', '');
				el.className = className + (state ? ' '+name : '')
			}
		}
	}


	function _css(el, prop, val){
		if( el && el.style ){
			if( val === void 0 ){
				if( document.defaultView && document.defaultView.getComputedStyle ){
					val = document.defaultView.getComputedStyle(el, '');
				}
				else if( el.currentStyle ){
					val	= el.currentStyle;
				}
				return	prop === void 0 ? val : val[prop];
			} else {
				el.style[prop] = val + (typeof val === 'string' ? '' : 'px');
			}
		}
	}


	function _find(ctx, tagName, iterator){
		if( ctx ){
			var list = ctx.getElementsByTagName(tagName), i = 0, n = list.length;
			if( iterator ){
				for( ; i < n; i++ ){
					iterator(list[i], i);
				}
			}
			return	list;
		}
		return	[];
	}


	function _disableDraggable(el){
		return el.draggable = false;
	}


	function _unsilent(){
		_silent = false;
	}



	// Export utils
	Sortable.utils = {
		on: _on,
		off: _off,
		css: _css,
		find: _find,
		bind: _bind,
		closest: _closest,
		toggleClass: _toggleClass
	};


	Sortable.version = '0.1.5';

	// Export
	return	Sortable;
});
