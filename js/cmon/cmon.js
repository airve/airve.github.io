/*!
 * cmon 0.6.0+201311090640
 * https://github.com/ryanve/cmon
 * MIT License 2013 Ryan Van Etten
 */

(function(root, name, make) {
    if (typeof module != 'undefined' && module['exports']) {
        module['exports'] = make.call(root);
    } else {
        root[name] = make = make.call(root);
        root['require'] || make['claim']('require', make['require'], root);
        root['provide'] || make['claim']('provide', make['provide'], root);
        make['provide'](name, make);
    }
}(this, 'cmon', function() {

    var globe = typeof window != 'undefined' && window || typeof global != 'undefined' && global
      , root = this || globe
      , modules = {}
      , claimed = {}
      , owns = claimed.hasOwnProperty;

    /**
     * @param {string|number|Array} id or deps
     * @param {(Function|number)=} fn or index
     * @link http://wiki.commonjs.org/wiki/Modules/1.1.1
     */
    function require(id, fn) {
        if (null == id) throw new TypeError('@require');
        if (typeof fn == 'function') return able(id, fn);
        return (null != modules[id] ? modules : null != root[id] ? root : globe)[id];
    }

    /**
     * @param {string|number} id
     * @param {*=} value
     */
    function provide(id, value) {
        if (null == id) throw new TypeError('@provide');
        modules[id] = value;
        provide['emit'](id);
        return value;
    }

    /**
     * @param {string|number|Function} id
     * @param {*=} value
     * @param {*=} guard
     */
    function cmon(id, value) {
        if (typeof id == 'function') return void id.call(root, cmon);
        // Check for 2 so that arrays map v/i/a as require
        return 2 == arguments.length ? provide(id, value) : require(id);
    }
    
    /**
     * @param {string|number} id
     * @param {*=} value
     * @param {*=} scope
     */
    function claim(id, value, scope) {
        if (null == id) throw new TypeError('@claim');
        scope = scope || root;
        claimed[id] = scope[id]; // store previous value
        return scope[id] = value; 
    }
    
    /**
     * @param {string|number} id
     * @param {*=} value
     * @param {*=} scope
     */
    function unclaim(id, value, scope) {
        if (null == id) throw new TypeError('@unclaim');
        scope = scope || root;
        if (null == value || value === scope[id])
            scope[id] = owns.call(claimed, id) ? claimed[id] : void 0;
        return value;
    }
    
    /**
     * @this {Object|Function}
     * @param {(boolean|Function)=} fn 
     * @return {Object|Function}
     */
    function noConflict(fn) {
        unclaim('provide', provide);
        unclaim('require', require);
        fn && null != this['id'] && unclaim(this['id'], this);
        typeof fn == 'function' && fn.call(root, this); 
        return this;
    }
    
    // Make an event emitter API for provide()
    (function(target, context, handlers, owns) {
        /**
         * @param {Array|Object} fns
         * @param {*=} scope
         * @param {number} fired
         */
        function callEach(fns, scope) {
            for (var i = 0, l = fns && fns.length; i < l && false !== fns[i++].call(scope);) {}
            return i;
        }

        /**
         * @param {Array} arr to mutate
         * @param {*=} item to remove
         */
        function pull(arr, item) {
            // Loop down so that splices don't interfere with subsequent iterations.
            for (var i = arr.length; i--;) item === arr[i] && arr.splice(i, 1);
            return arr;
        }
        
        /**
         * @param {string|number} id
         * @param {number} fired
         */    
        target['emit'] = function(id) {
            return owns.call(handlers, id) ? callEach(handlers[id], context) : 0;
        };
        
        /**
         * @deprecated Use .emit() instead
         * @param {Array|string|number} id
         */    
        target['trigger'] = function(id) {
            var l, i = 0, em = target['emit'];
            if (typeof id != 'object') em(id);
            else for (l = id.length; i < l;) em(id[i++]);
        };
    
        /**
         * @param {Array|string|number} id
         * @param {Function} fn
         * @return {number}
         */    
        target['on'] = function(id, fn) {
            if (null == id || typeof fn != 'function') throw new TypeError('@on');
            id = [].concat(id);
            for (var n = 0, i = 0, l = id.length; i < l; i++)
                n += (handlers[id[i]] = owns.call(handlers, id[i]) && handlers[id[i]] || []).push(fn);
            return n;
        };
        
        /**
         * @param {Array|string|number} id
         * @param {Function=} fn
         * @return {number}
         */
        target['off'] = function(id, fn) {
            id = [].concat(id);
            for (var k, n = 0, i = 0, l = id.length; i < l;) {
                if (owns.call(handlers, k = id[i++]) && null != k) {
                    if (void 0 === fn) handlers[k] = fn; // Undefine (remove all).
                    else handlers[k] && (n += pull(handlers[k], fn).length);
                }
            }
            return n;
        };
        
        /**
         * @param {Array|string|number} id
         * @param {Function} fn
         * @return {number}
         */    
        target['one'] = function(id, fn) {
            return target['on'](id, wrapped);
            function wrapped() {
                target['off'](id, wrapped);
                return fn.apply(this, arguments);
            }
        };
        
        /**
         * @param {Array|string|number} id
         * @param {Function} fn
         * @return {number}
         */    
        target['done'] = function(id, fn) {
            var wrapped;
            return target['on'](id, wrapped = typeof fn == 'function' ? function() {
                var r = fn.apply(this, arguments);
                true === r && target['off'](id, wrapped);
                return r;
            } : wrapped);
        };
        
        return target;
    }(provide, root, {}, owns));
    
    /**
     * @param {Array|string|number} id
     * @param {Function} fn
     * @param {*=} scope
     */    
    function inquire(id, fn, scope) {
        id = [].concat(id);
        fn = fn || require;
        for (var what, i = 0, l = id.length; i < l;)
            if (what = fn.call(scope, id[i++]), null != what)
                return what;
    }
    
    /**
     * @param {Array|string|number} id
     * @param {Function=} fn
     * @param {*=} scope
     */
    function unavailable(id, fn, scope) {
        id = [].concat(id);
        fn = fn || inquire;
        for (var r = [], i = 0, l = id.length; i < l; i++)
            null == fn.call(scope, id[i]) && r.push(id[i]);
        return r.length ? r : false;
    }
    
    /**
     * @param {Array|string|number} id
     * @param {Function=} fn
     * @param {*=} scope
     */
    function occupy(id, fn, scope) {
        id = [].concat(id);
        fn = fn || inquire;
        for (var r = [], i = 0, l = id.length; i < l; i++)
            r[i] = fn.call(scope, id[i]);
        return r;
    }
    
    /**
     * @param {Array|string|number} id
     * @param {Function=} fn
     * @param {number=} timeout
     * @return {boolean}
     */
    function able(id, fn, timeout) {
        if (null == id) throw new TypeError('@able');
        var force = typeof timeout == 'number'
          , queue = unavailable(id)
          , now = !queue;

        function run() {
            if (now || force || !unavailable(id)) {
                now || provide['off'](queue, run);
                fn.apply(root, occupy(id));
            }
        }

        null == fn || (now ? run() : (
            provide['on'](queue, run), 
            force && setTimeout(run, timeout)
        ));
        return now;
    }
    
    cmon['able'] = able;
    cmon['provide'] = provide;
    cmon['require'] = require;
    cmon['claim'] = claim;
    cmon['unclaim'] = unclaim;
    cmon['noConflict'] = noConflict;
    return cmon;
}));