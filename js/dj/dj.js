/*!
 * dj           remixable hook/bridge/relay API designed for
 *              writing highly-extendable modular JavaScript
 * @author      Ryan Van Etten (c) 2012
 * @link        http://github.com/ryanve/dj
 * @license     MIT
 * @version     0.6.0
 */

/*jslint browser: true, devel: true, node: true, passfail: false, bitwise: true
, continue: true, debug: true, eqeq: true, es5: true, forin: true, newcap: true
, nomen: true, plusplus: true, regexp: true, undef: true, sloppy: true, stupid: true
, sub: true, white: true, indent: 4, maxerr: 180 */

(function (root, name, factory) {// separate the module logic from its definition ( @ded pattern ;)
    if (typeof module != 'undefined' && module['exports']){ module['exports'] = factory(); } // node
    else { root[name] = root[name] || factory(); } // browser
}(this, 'dj', function () {

    var OP = Object.prototype
      , owns = OP.hasOwnProperty

      , gnd = (function () {
            var globe = this || window;
            return function (o) {
                // for grounding (securing) scope
                return o == null || o === globe ? 0 : o;
            };
        }())

      , ES5lineage = (function (Object) {
            // Feature test: check that Object.create exists and 
            // that it properly implements the full capabilities
            // of the first param. (Does not test the 2nd param.)
            // Read @link github.com/kriskowal/es5-shim/pull/118
            var k = 'k', o;
            function fun () {}
            fun[k] = 'object';
            try {
                o = Object.create(null); // attempt to create an object with *zero* properties
                if ( !o || o.toString || Object.getPrototypeOf(o) !== null ) { return false; }
                if ( !Object.create([]).pop || !(o = Object.create(fun)) ) { return false; }
                return typeof o === o[k] && Object.getPrototypeOf(o) === fun;
            } catch (e){ return false; }
        }(Object))
        
      , pro = (ES5lineage && Object.getPrototypeOf) || function (ob) {
            // `Object.getPrototypeOf` fallback
            if ( void 0 !== ob["__proto__"] ) { return ob["__proto__"]; }
            return ob.constructor ? ob.constructor.prototype : OP;
        }

        /**
         * Create a new empty object whose prototype is set to the supplied arg. 
         * Uses to native Object.create when possible. The fallback supports
         * the *first arg* only. Adapted from @link github.com/kriskowal/es5-shim
         * @link   bit.ly/mdn-object-create
         * @link   github.com/kriskowal/es5-shim/pull/118
         * @param  {Object|Function|Array|null}  parent  (typeof "object"|"function")
         * @return {Object}  is an empty object that inherits properties from `parent`
         */
      , nu = (ES5lineage && Object.create) || function (parent) {
            /** @constructor */
            function F () {} // An empty constructor.
            var object; // Becomes an `instanceof F`            
            if (null === parent) { return { "__proto__": null }; }
            F.prototype = parent;  // Set F's prototype to the parent Object
            object = new F; // Get an empty object (instance) that inherits `parent`
            object["__proto__"] = parent; // ensure `Object.getPrototypeOf` will work in IE
            return object;
        }

    ;

    /**
     * Make new empty object w/ same proto as the `source`. Then
     * mixin the owned props from the `source` into the new object. 
     * Quasi deep clone (done partially via inheritance)
     * @param  {(Object|Function|null)=}  source
     * @param  {(Object|Function|null)=}  opt_parent
     * @return {Object}
     */
    function resample (source, opt_parent) {
        var n, r;
        if ( true === source || !arguments.length ) { source = this; }
        if ( void 0 === opt_parent ) { opt_parent = pro(source); }
        r = nu( opt_parent );
        for ( n in source ) {
            // owned props enumerate first so stop when unowned
            if ( !owns.call(source, n) ) { break; }
            r[n] = source[n]; 
        }
        return r;
    }

    /**
     * Multi-purpose extender/augmenter, with simple yet very useful options, called 
     * expand b/c many libs implement extend/augment methods, so this makes it easier 
     * to integrate ( and drop preconceived notions about what it should do ). 
     * Expand your mind ;]
     *
     * @param  {Object|Function}     receiver
     * @param  {Object|Function}     supplier
     * @param  {boolean=}            force     whether to overwrite existing props
     *                                         true  ==> no typechecking is done.
     *                                         false ==> receiver[n] must be null|undefined.
     *                                                   supplier[n] must NOT be null|undefined.
     * @param  {(boolean|Function)=}  check    whether supplier props must be owned (or a 
     *                                         custom test, default: false)
     */
    function expand (receiver, supplier, force, check) {
        var n;
        if ( null == receiver ) { throw new TypeError('@expand'); }
        if ( null == supplier ) { return receiver; }
        force = force === true; // must be explicit
        check = check === true ? owns : check;
        for ( n in supplier ) {
            if ( force || (receiver[n] == null && supplier[n] != null) ) {
                if ( !check || check.call(supplier, n) ) {
                    receiver[n] = supplier[n];
                }
            }
        }
        return receiver;
    }

    /**
     * Mixin owned enumerable props from the `supplier` into `this`.
     * @this   {(Object|Function)}            is the receiver
     * @param  {(Object|Function)}  supplier  is the supplier
     * @param  {boolean=}           force     whether to overwrite existing props
     * @param  {boolean=}           check     whether props must be owned (default: true)
     */
    function mixin ( supplier, force, check ) {
        if ( !gnd(this) ) { throw new TypeError('@mixin'); }
        return expand(this, supplier, force, check !== false);
    }

    /**
     * bridge()      Integrate applicable methods|objects into a host. Other 
     *               types (number|string|undefined|boolean|null) are not bridged. 
     *               `this` augments the receiver `r`. `bridge()` is designed for
     *               merging jQueryish modules, thus `.fn` props bridge one level deep.
     *
     *               Methods|objects whose `.relay` property is set to `false` get
     *               skipped. If the `.relay` property is a function, it is fired 
     *               with `this` being the method|object and the 1st arg being the 
     *               main scope (e.g. $ function) of the receiving api. This provides
     *               a way for the method|object to be adapted to the receiving api.
     *
     *               If the `.relay` returns a truthy value (such as new func) then that 
     *               value is transferred instead of the orig. If the relay returns `false` 
     *               then the method|ob is skipped. If it returns any other falsey value 
     *               then the transferred method will default back to the orig. So in effect, 
     *               the `.relay` prop defaults to `true` and it is not necessary to define 
     *               it for methods|obs that are to be transferred as is.
     *       
     * @this  {Object|Function}                supplier
     * @param {Object|Function}         r      receiver
     * @param {boolean=}                force  whether to overwrite existing props (default: false)
     * @param {(Object|Function|null)=} $      the top-level of the host api (default: `r`)
     *                                         For default behavior `$` should be omitted or set to 
     *                                         `undefined`. This param allows you to bridge to a receiver, 
     *                                         but relay methods based on a another host, for example 
     *                                         `someModule.bridge({}, false, jQuery)`. Set `$` explicity
     *                                         to `null` *only* if you want to communicate to relays that
     *                                         there should be *no* main api.                                   
     */
    function bridge ( r, force, $ ) {

        var v, k, relay, s = this; // s is the supplier
        if ( !r || !gnd(s) ) { return; }
        force = true === force; // require explicit true to force
        $ = typeof $ == 'function' || typeof $ == 'object' ? $ : r; // allow null

        for ( k in s ) {
            v = s[k];
            if ( typeof v == 'function' || typeof v == 'object' && v ) {
                if ( 'fn' === k && v !== s ) {
                    // 2nd check above prevents infinite loop 
                    // from `.fn` having ref to self on it.
                    bridge.call(v, r[k], force, $);
                } else if ( force ? r[k] !== r && r[k] !== $ : r[k] == null ) {
                    // The check above prevents overwriting receiver's refs to
                    // self (even if forced). Now handle relays and the transfer:
                    relay = v['relay'];
                    if ( typeof relay == 'function' ) {
                        // Fire relay functions. I haven't fully solidified the
                        // relay call sig. Considering: .call(v, $, r[k], k, r)
                        // This passes the essentials:
                        relay = relay.call(v, $, r[k]);
                    }
                    if ( relay !== false ) {// Provides a way to bypass non-agnostic props.
                        // Transfer the value. Default to the orig supplier value:
                        r[k] = relay || v;
                    }
                }
            }
        }
        return r; // receiver

    }// bridge
    
    // signify that this bridge() is module agnostic
    bridge['relay'] = true;

    /**
     * Create a new hook() function tied to a clean hash.
     * @return {Function}
     */
    function hookRemix () {
        
        // Use objects that inherit null for hashes so that we don't need to
        // test hasOwnProperty on "gets".
        // Sidenode: ES5's `Object.create(null)` returns `{"__proto__": null}`
        var defs = nu(null)  // defaults' hash
          , curr = nu(null)  // currents' hash
          , info = nu(null); // status hash (burned hooks cannot be updated)
          
        /** 
         * Method for setting/getting hooks
         * @param {*=}  k     key
         * @param {*=}  v     value
         */
        function hook (k, v) {

            var n, parlay, prefix, clone; 
            k = typeof k == 'function' ? k.call(this, hook()) : k;
            
            // optimize for simple usage (esp. GET-simple)
            
            if ( typeof k == 'string' || typeof k == 'number' ) {
                if ( void 0 === v ) {
                    return curr[k]; // GET-simple
                }
                if ( info ) { // only SET if 'BURN all' has not occured
                    // SET-simple (`v` can be "object" only if the hook is empty or its default is "object")
                    if ( typeof v == 'function' || typeof v == 'object' && typeof defs[k] != 'function' ) {
                        if ( v && info[k] !== false ) {// update unless burned
                            curr[k] = v;
                            defs[k] = defs[k] || v;
                        }
                    } else if ( v === false ) {// burn it (lock it) at its current state
                        info[k] = v; // false
                    } else if ( v === true ) { // restore default (possible even if burned)
                        curr[k] = defs[k]; 
                    }
                }
                if ( null === v ) {
                    return info[k] !== false; // status
                }

                return gnd(this) || curr[k]; // curr value
            }

            if ( typeof k == 'boolean' ) {
                if ( !k ) {// BURN all (false)
                    info = defs = null; // (nullify both to free up memory)
                } else if ( info ) {// RESTORE defaults (true) (if 'BURN all' has not occured)
                    curr = nu(null);
                    for ( n in defs ) {
                        curr[n] = defs[n]; 
                    }
                }
                k = void 0; // reset `k` so it parlays into the GET-all block
            }
            
            if ( void 0 === k ) { // GET-all
                clone = nu(null); 
                for ( n in curr ) {
                    clone[n] = curr[n]; 
                }
                return clone;
            }
            
            if ( null === k ) { // GET-status-all
                return !!info; 
            }
            
            // `k` must be "object" if we get to here
            if ( info ) {// SET-multi
                prefix = typeof v == 'string' ? v : '';
                parlay = typeof v == 'boolean';
                for ( n in k ) {
                    hook(prefix + n, k[n]); // set each
                    parlay && hook(prefix + n, v); 
                }
            }
            
            return gnd(this) || void 0;

        }// hook
        
        // Allow an existing `hook()` to be bridged to another module so that
        // they can share hooks. (In other words, don't set its relay to false.) 
        // Provide the remix method as a way to explicitly redefine it:
        hook['remix'] = hookRemix;

        return hook;

    }// hookRemix
    
    return {// the export
        'hook': hookRemix()
      , 'owns' : owns
      , 'pro': pro
      , 'nu': nu
      , 'bridge': bridge 
      , 'resample': resample
      , 'expand': expand
      , 'mixin': mixin
      , 'submix': function (subModule, force) {
            return bridge.call(subModule, this, force);
        }
    };

}));