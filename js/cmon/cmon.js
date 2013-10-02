/*!
 * cmon 0.5.2+201309031951
 * https://github.com/ryanve/cmon
 * MIT License 2013 Ryan Van Etten
 */

(function(root, name, make) {
    if (typeof module != 'undefined' && module['exports']) {
        module['exports'] = make.call(root);
    } else {
        root[name] = make = make.call(root);
        make['id'] = name;
        root['require'] || make['claim']('require', make['require'], root);
        root['provide'] || make['claim']('provide', make['provide'], root);
        make['provide'](name, make);
    }
}(this, 'cmon', function() {

    var root = this || window
      , modules = {}
      , claimed = {}
      , owns = claimed.hasOwnProperty;

    /**
     * @param  {string|number} id
     * @link   wiki.commonjs.org/wiki/Modules/1.1.1
     */
    function require(id) {
        if (null == id) throw new TypeError('@require');
        return (owns.call(modules, id) ? modules : root)[id];
    }

    /**
     * @param  {string|number} id
     * @param  {*=}            value
     */
    function provide(id, value) {
        if (null == id) throw new TypeError('@provide');
        modules[id] = value;
        provide['trigger'](id);
        return value;
    }

    /**
     * @param  {string|number|Function} id
     * @param  {*=}  value
     */
    function cmon(id, value) {
        if (typeof id != 'function')
            // Check for 2 so that arrays map v/i/a as require
            return 2 == arguments.length ? provide.call(root, id, value) : require.call(root, id);
        // Call callback and return undefined
        id.call(root, cmon);
    }
    
    /**
     * @param  {string|number} id
     * @param  {*=}            value
     * @param  {*=}            scope
     */
    function claim(id, value, scope) {
        if (null == id) throw new TypeError('@claim');
        scope = scope || root;
        claimed[id] = scope[id]; // store previous value
        return scope[id] = value; 
    }
    
    /**
     * @param  {string|number} id
     * @param  {*=}            value
     * @param  {*=}            scope
     */
    function unclaim(id, value, scope) {
        if (null == id) throw new TypeError('@unclaim');
        scope = scope || root;
        if (null == value || value === scope[id])
            scope[id] = owns.call(claimed, id) ? claimed[id] : void 0;
        return value;
    }
    
    /**
     * @this   {Object|Function}
     * @param  {(boolean|Function)=} fn 
     * @return {Object|Function}
     */
    function noConflict(fn) {
        unclaim('provide', provide);
        unclaim('require', require);
        fn && null != this['id'] && unclaim(this['id'], this);
        typeof fn == 'function' && fn.call(root, this); 
        return this;
    }
    
    // Make an on/off/trigger event API for provide()
    (function(target, triggerScope, handlers, owns) {
        /**
         * @param  {Array|Object} fns
         * @param  {*=}           scope
         */
        function callEach(fns, scope) {
            for (var i = 0, l = fns && fns.length; i < l;)
                if (false === fns[i++].call(scope)) break;
        }

        /**
         * @param  {Array} arr      array to mutate
         * @param  {*=}    ejectee  value to remove
         */
        function eject(arr, ejectee) {
            for (var i = arr.length; i--;)
                ejectee === arr[i] && arr.splice(i, 1);
            return arr;
        }
        
        /**
         * @param  {Array|string|number} id
         */    
        target['trigger'] = function(id) {
            id = typeof id == 'object' ? id : [id];
            for (var i = 0, l = id.length; i < l; i++)
                owns.call(handlers, id[i]) && callEach(handlers[id[i]], triggerScope);
        };
    
        /**
         * @param  {string|number|Array} id
         * @param  {Function}            fn
         * @return {number}
         */    
        target['on'] = function(id, fn) {
            if (null == id || typeof fn != 'function')
                throw new TypeError('@on');
            id = [].concat(id);
            for (var n = 0, i = 0, l = id.length; i < l; i++)
                n += (handlers[id[i]] = owns.call(handlers, id[i]) && handlers[id[i]] || []).push(fn);
            return n;
        };
        
        /**
         * @param  {string|number|Array} id
         * @param  {Function=}           fn
         * @return {number}
         */
        target['off'] = function(id, fn) {
            id = [].concat(id);
            for (var k, n = 0, i = 0, l = id.length; i < l;) {
                if (owns.call(handlers, k = id[i++]) && null != k) {
                    if (void 0 === fn) handlers[k] = fn; // Undefine - remove all.
                    else handlers[k] && (n += eject(handlers[k], fn).length);
                }
            }
            return n;
        };
        
        /**
         * @param  {string|number|Array} id
         * @param  {Function}            fn
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
         * @param  {string|number|Array} id
         * @param  {Function}            fn
         * @return 
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
     * @param  {Array|string|number}   id
     * @param  {Function}              fn
     * @param  {*=}                    scope
     */    
    function inquire(id, fn, scope) {
        id = [].concat(id);
        fn = fn || require;
        for (var what, i = 0, l = id.length; i < l;)
            if (what = fn.call(scope, id[i++]), null != what)
                return what;
    }
    
    /**
     * @param  {Array|string|number} id
     * @param  {Function=}           fn
     * @param  {*=}                  scope
     */
    function unavailable(id, fn, scope) {
        id = [].concat(id);
        fn = fn || inquire;
        for (var r = [], i = 0, l = id.length; i < l; i++)
            null == fn.call(scope, id[i]) && r.push(id[i]);
        return r.length ? r : false;
    }
    
    /**
     * @param  {Array|string|number} id
     * @param  {Function=}           fn
     * @param  {*=}                  scope
     */
    function occupy(id, fn, scope) {
        id = [].concat(id);
        fn = fn || inquire;
        for (var r = [], i = 0, l = id.length; i < l; i++)
            r[i] = fn.call(scope, id[i]);
        return r;
    }
    
    /**
     * @param  {Array|string|number} id
     * @param  {Function=}           fn
     * @param  {number=}             timeout
     * @return {Array|boolean}
     */
    cmon['able'] = function(id, fn, timeout) {
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
    };

    cmon['provide'] = provide;
    cmon['require'] = require;
    cmon['claim'] = claim;
    cmon['unclaim'] = unclaim;
    cmon['noConflict'] = noConflict;
    return cmon;
}));