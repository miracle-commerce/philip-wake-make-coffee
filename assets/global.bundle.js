function _defineProperty2(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
/**
 * This work is licensed under the W3C Software and Document License
 * (http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document).
 */


(function () {
  // Return early if we're not running inside of the browser.
  if (typeof window === 'undefined') {
    return;
  } // Convenience function for converting NodeLists.

  /** @type {typeof Array.prototype.slice} */


  var slice = Array.prototype.slice;
  /**
   * IE has a non-standard name for "matches".
   * @type {typeof Element.prototype.matches}
   */

  var matches = Element.prototype.matches || Element.prototype.msMatchesSelector;
  /** @type {string} */

  var _focusableElementsString = ['a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', 'button:not([disabled])', 'details', 'summary', 'iframe', 'object', 'embed', '[contenteditable]'].join(',');
  /**
   * `InertRoot` manages a single inert subtree, i.e. a DOM subtree whose root element has an `inert`
   * attribute.
   *
   * Its main functions are:
   *
   * - to create and maintain a set of managed `InertNode`s, including when mutations occur in the
   *   subtree. The `makeSubtreeUnfocusable()` method handles collecting `InertNode`s via registering
   *   each focusable node in the subtree with the singleton `InertManager` which manages all known
   *   focusable nodes within inert subtrees. `InertManager` ensures that a single `InertNode`
   *   instance exists for each focusable node which has at least one inert root as an ancestor.
   *
   * - to notify all managed `InertNode`s when this subtree stops being inert (i.e. when the `inert`
   *   attribute is removed from the root node). This is handled in the destructor, which calls the
   *   `deregister` method on `InertManager` for each managed inert node.
   */


  var InertRoot = function () {
    /**
     * @param {!Element} rootElement The Element at the root of the inert subtree.
     * @param {!InertManager} inertManager The global singleton InertManager object.
     */
    function InertRoot(rootElement, inertManager) {
      _classCallCheck(this, InertRoot);
      /** @type {!InertManager} */


      this._inertManager = inertManager;
      /** @type {!Element} */

      this._rootElement = rootElement;
      /**
       * @type {!Set<!InertNode>}
       * All managed focusable nodes in this InertRoot's subtree.
       */

      this._managedNodes = new Set(); // Make the subtree hidden from assistive technology

      if (this._rootElement.hasAttribute('aria-hidden')) {
        /** @type {?string} */
        this._savedAriaHidden = this._rootElement.getAttribute('aria-hidden');
      } else {
        this._savedAriaHidden = null;
      }

      this._rootElement.setAttribute('aria-hidden', 'true'); // Make all focusable elements in the subtree unfocusable and add them to _managedNodes


      this._makeSubtreeUnfocusable(this._rootElement); // Watch for:
      // - any additions in the subtree: make them unfocusable too
      // - any removals from the subtree: remove them from this inert root's managed nodes
      // - attribute changes: if `tabindex` is added, or removed from an intrinsically focusable
      //   element, make that node a managed node.


      this._observer = new MutationObserver(this._onMutation.bind(this));

      this._observer.observe(this._rootElement, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }
    /**
     * Call this whenever this object is about to become obsolete.  This unwinds all of the state
     * stored in this object and updates the state of all of the managed nodes.
     */


    _createClass(InertRoot, [{
      key: 'destructor',
      value: function destructor() {
        this._observer.disconnect();

        if (this._rootElement) {
          if (this._savedAriaHidden !== null) {
            this._rootElement.setAttribute('aria-hidden', this._savedAriaHidden);
          } else {
            this._rootElement.removeAttribute('aria-hidden');
          }
        }

        this._managedNodes.forEach(function (inertNode) {
          this._unmanageNode(inertNode.node);
        }, this); // Note we cast the nulls to the ANY type here because:
        // 1) We want the class properties to be declared as non-null, or else we
        //    need even more casts throughout this code. All bets are off if an
        //    instance has been destroyed and a method is called.
        // 2) We don't want to cast "this", because we want type-aware optimizations
        //    to know which properties we're setting.


        this._observer =
        /** @type {?} */
        null;
        this._rootElement =
        /** @type {?} */
        null;
        this._managedNodes =
        /** @type {?} */
        null;
        this._inertManager =
        /** @type {?} */
        null;
      }
      /**
       * @return {!Set<!InertNode>} A copy of this InertRoot's managed nodes set.
       */

    }, {
      key: '_makeSubtreeUnfocusable',

      /**
       * @param {!Node} startNode
       */
      value: function _makeSubtreeUnfocusable(startNode) {
        var _this2 = this;

        composedTreeWalk(startNode, function (node) {
          return _this2._visitNode(node);
        });
        var activeElement = document.activeElement;

        if (!document.body.contains(startNode)) {
          // startNode may be in shadow DOM, so find its nearest shadowRoot to get the activeElement.
          var node = startNode;
          /** @type {!ShadowRoot|undefined} */

          var root = undefined;

          while (node) {
            if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
              root =
              /** @type {!ShadowRoot} */
              node;
              break;
            }

            node = node.parentNode;
          }

          if (root) {
            activeElement = root.activeElement;
          }
        }

        if (startNode.contains(activeElement)) {
          activeElement.blur(); // In IE11, if an element is already focused, and then set to tabindex=-1
          // calling blur() will not actually move the focus.
          // To work around this we call focus() on the body instead.

          if (activeElement === document.activeElement) {
            document.body.focus();
          }
        }
      }
      /**
       * @param {!Node} node
       */

    }, {
      key: '_visitNode',
      value: function _visitNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        var element =
        /** @type {!Element} */
        node; // If a descendant inert root becomes un-inert, its descendants will still be inert because of
        // this inert root, so all of its managed nodes need to be adopted by this InertRoot.

        if (element !== this._rootElement && element.hasAttribute('inert')) {
          this._adoptInertRoot(element);
        }

        if (matches.call(element, _focusableElementsString) || element.hasAttribute('tabindex')) {
          this._manageNode(element);
        }
      }
      /**
       * Register the given node with this InertRoot and with InertManager.
       * @param {!Node} node
       */

    }, {
      key: '_manageNode',
      value: function _manageNode(node) {
        var inertNode = this._inertManager.register(node, this);

        this._managedNodes.add(inertNode);
      }
      /**
       * Unregister the given node with this InertRoot and with InertManager.
       * @param {!Node} node
       */

    }, {
      key: '_unmanageNode',
      value: function _unmanageNode(node) {
        var inertNode = this._inertManager.deregister(node, this);

        if (inertNode) {
          this._managedNodes['delete'](inertNode);
        }
      }
      /**
       * Unregister the entire subtree starting at `startNode`.
       * @param {!Node} startNode
       */

    }, {
      key: '_unmanageSubtree',
      value: function _unmanageSubtree(startNode) {
        var _this3 = this;

        composedTreeWalk(startNode, function (node) {
          return _this3._unmanageNode(node);
        });
      }
      /**
       * If a descendant node is found with an `inert` attribute, adopt its managed nodes.
       * @param {!Element} node
       */

    }, {
      key: '_adoptInertRoot',
      value: function _adoptInertRoot(node) {
        var inertSubroot = this._inertManager.getInertRoot(node); // During initialisation this inert root may not have been registered yet,
        // so register it now if need be.


        if (!inertSubroot) {
          this._inertManager.setInert(node, true);

          inertSubroot = this._inertManager.getInertRoot(node);
        }

        inertSubroot.managedNodes.forEach(function (savedInertNode) {
          this._manageNode(savedInertNode.node);
        }, this);
      }
      /**
       * Callback used when mutation observer detects subtree additions, removals, or attribute changes.
       * @param {!Array<!MutationRecord>} records
       * @param {!MutationObserver} self
       */

    }, {
      key: '_onMutation',
      value: function _onMutation(records, self) {
        records.forEach(function (record) {
          var target =
          /** @type {!Element} */
          record.target;

          if (record.type === 'childList') {
            // Manage added nodes
            slice.call(record.addedNodes).forEach(function (node) {
              this._makeSubtreeUnfocusable(node);
            }, this); // Un-manage removed nodes

            slice.call(record.removedNodes).forEach(function (node) {
              this._unmanageSubtree(node);
            }, this);
          } else if (record.type === 'attributes') {
            if (record.attributeName === 'tabindex') {
              // Re-initialise inert node if tabindex changes
              this._manageNode(target);
            } else if (target !== this._rootElement && record.attributeName === 'inert' && target.hasAttribute('inert')) {
              // If a new inert root is added, adopt its managed nodes and make sure it knows about the
              // already managed nodes from this inert subroot.
              this._adoptInertRoot(target);

              var inertSubroot = this._inertManager.getInertRoot(target);

              this._managedNodes.forEach(function (managedNode) {
                if (target.contains(managedNode.node)) {
                  inertSubroot._manageNode(managedNode.node);
                }
              });
            }
          }
        }, this);
      }
    }, {
      key: 'managedNodes',
      get: function get() {
        return new Set(this._managedNodes);
      }
      /** @return {boolean} */

    }, {
      key: 'hasSavedAriaHidden',
      get: function get() {
        return this._savedAriaHidden !== null;
      }
      /** @param {?string} ariaHidden */

    }, {
      key: 'savedAriaHidden',
      set: function set(ariaHidden) {
        this._savedAriaHidden = ariaHidden;
      }
      /** @return {?string} */
      ,
      get: function get() {
        return this._savedAriaHidden;
      }
    }]);

    return InertRoot;
  }();
  /**
   * `InertNode` initialises and manages a single inert node.
   * A node is inert if it is a descendant of one or more inert root elements.
   *
   * On construction, `InertNode` saves the existing `tabindex` value for the node, if any, and
   * either removes the `tabindex` attribute or sets it to `-1`, depending on whether the element
   * is intrinsically focusable or not.
   *
   * `InertNode` maintains a set of `InertRoot`s which are descendants of this `InertNode`. When an
   * `InertRoot` is destroyed, and calls `InertManager.deregister()`, the `InertManager` notifies the
   * `InertNode` via `removeInertRoot()`, which in turn destroys the `InertNode` if no `InertRoot`s
   * remain in the set. On destruction, `InertNode` reinstates the stored `tabindex` if one exists,
   * or removes the `tabindex` attribute if the element is intrinsically focusable.
   */


  var InertNode = function () {
    /**
     * @param {!Node} node A focusable element to be made inert.
     * @param {!InertRoot} inertRoot The inert root element associated with this inert node.
     */
    function InertNode(node, inertRoot) {
      _classCallCheck(this, InertNode);
      /** @type {!Node} */


      this._node = node;
      /** @type {boolean} */

      this._overrodeFocusMethod = false;
      /**
       * @type {!Set<!InertRoot>} The set of descendant inert roots.
       *    If and only if this set becomes empty, this node is no longer inert.
       */

      this._inertRoots = new Set([inertRoot]);
      /** @type {?number} */

      this._savedTabIndex = null;
      /** @type {boolean} */

      this._destroyed = false; // Save any prior tabindex info and make this node untabbable

      this.ensureUntabbable();
    }
    /**
     * Call this whenever this object is about to become obsolete.
     * This makes the managed node focusable again and deletes all of the previously stored state.
     */


    _createClass(InertNode, [{
      key: 'destructor',
      value: function destructor() {
        this._throwIfDestroyed();

        if (this._node && this._node.nodeType === Node.ELEMENT_NODE) {
          var element =
          /** @type {!Element} */
          this._node;

          if (this._savedTabIndex !== null) {
            element.setAttribute('tabindex', this._savedTabIndex);
          } else {
            element.removeAttribute('tabindex');
          } // Use `delete` to restore native focus method.


          if (this._overrodeFocusMethod) {
            delete element.focus;
          }
        } // See note in InertRoot.destructor for why we cast these nulls to ANY.


        this._node =
        /** @type {?} */
        null;
        this._inertRoots =
        /** @type {?} */
        null;
        this._destroyed = true;
      }
      /**
       * @type {boolean} Whether this object is obsolete because the managed node is no longer inert.
       * If the object has been destroyed, any attempt to access it will cause an exception.
       */

    }, {
      key: '_throwIfDestroyed',

      /**
       * Throw if user tries to access destroyed InertNode.
       */
      value: function _throwIfDestroyed() {
        if (this.destroyed) {
          throw new Error('Trying to access destroyed InertNode');
        }
      }
      /** @return {boolean} */

    }, {
      key: 'ensureUntabbable',

      /** Save the existing tabindex value and make the node untabbable and unfocusable */
      value: function ensureUntabbable() {
        if (this.node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        var element =
        /** @type {!Element} */
        this.node;

        if (matches.call(element, _focusableElementsString)) {
          if (
          /** @type {!HTMLElement} */
          element.tabIndex === -1 && this.hasSavedTabIndex) {
            return;
          }

          if (element.hasAttribute('tabindex')) {
            this._savedTabIndex =
            /** @type {!HTMLElement} */
            element.tabIndex;
          }

          element.setAttribute('tabindex', '-1');

          if (element.nodeType === Node.ELEMENT_NODE) {
            element.focus = function () {};

            this._overrodeFocusMethod = true;
          }
        } else if (element.hasAttribute('tabindex')) {
          this._savedTabIndex =
          /** @type {!HTMLElement} */
          element.tabIndex;
          element.removeAttribute('tabindex');
        }
      }
      /**
       * Add another inert root to this inert node's set of managing inert roots.
       * @param {!InertRoot} inertRoot
       */

    }, {
      key: 'addInertRoot',
      value: function addInertRoot(inertRoot) {
        this._throwIfDestroyed();

        this._inertRoots.add(inertRoot);
      }
      /**
       * Remove the given inert root from this inert node's set of managing inert roots.
       * If the set of managing inert roots becomes empty, this node is no longer inert,
       * so the object should be destroyed.
       * @param {!InertRoot} inertRoot
       */

    }, {
      key: 'removeInertRoot',
      value: function removeInertRoot(inertRoot) {
        this._throwIfDestroyed();

        this._inertRoots['delete'](inertRoot);

        if (this._inertRoots.size === 0) {
          this.destructor();
        }
      }
    }, {
      key: 'destroyed',
      get: function get() {
        return (
          /** @type {!InertNode} */
          this._destroyed
        );
      }
    }, {
      key: 'hasSavedTabIndex',
      get: function get() {
        return this._savedTabIndex !== null;
      }
      /** @return {!Node} */

    }, {
      key: 'node',
      get: function get() {
        this._throwIfDestroyed();

        return this._node;
      }
      /** @param {?number} tabIndex */

    }, {
      key: 'savedTabIndex',
      set: function set(tabIndex) {
        this._throwIfDestroyed();

        this._savedTabIndex = tabIndex;
      }
      /** @return {?number} */
      ,
      get: function get() {
        this._throwIfDestroyed();

        return this._savedTabIndex;
      }
    }]);

    return InertNode;
  }();
  /**
   * InertManager is a per-document singleton object which manages all inert roots and nodes.
   *
   * When an element becomes an inert root by having an `inert` attribute set and/or its `inert`
   * property set to `true`, the `setInert` method creates an `InertRoot` object for the element.
   * The `InertRoot` in turn registers itself as managing all of the element's focusable descendant
   * nodes via the `register()` method. The `InertManager` ensures that a single `InertNode` instance
   * is created for each such node, via the `_managedNodes` map.
   */


  var InertManager = function () {
    /**
     * @param {!Document} document
     */
    function InertManager(document) {
      _classCallCheck(this, InertManager);

      if (!document) {
        throw new Error('Missing required argument; InertManager needs to wrap a document.');
      }
      /** @type {!Document} */


      this._document = document;
      /**
       * All managed nodes known to this InertManager. In a map to allow looking up by Node.
       * @type {!Map<!Node, !InertNode>}
       */

      this._managedNodes = new Map();
      /**
       * All inert roots known to this InertManager. In a map to allow looking up by Node.
       * @type {!Map<!Node, !InertRoot>}
       */

      this._inertRoots = new Map();
      /**
       * Observer for mutations on `document.body`.
       * @type {!MutationObserver}
       */

      this._observer = new MutationObserver(this._watchForInert.bind(this)); // Add inert style.

      addInertStyle(document.head || document.body || document.documentElement); // Wait for document to be loaded.

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this._onDocumentLoaded.bind(this));
      } else {
        this._onDocumentLoaded();
      }
    }
    /**
     * Set whether the given element should be an inert root or not.
     * @param {!Element} root
     * @param {boolean} inert
     */


    _createClass(InertManager, [{
      key: 'setInert',
      value: function setInert(root, inert) {
        if (inert) {
          if (this._inertRoots.has(root)) {
            // element is already inert
            return;
          }

          var inertRoot = new InertRoot(root, this);
          root.setAttribute('inert', '');

          this._inertRoots.set(root, inertRoot); // If not contained in the document, it must be in a shadowRoot.
          // Ensure inert styles are added there.


          if (!this._document.body.contains(root)) {
            var parent = root.parentNode;

            while (parent) {
              if (parent.nodeType === 11) {
                addInertStyle(parent);
              }

              parent = parent.parentNode;
            }
          }
        } else {
          if (!this._inertRoots.has(root)) {
            // element is already non-inert
            return;
          }

          var _inertRoot = this._inertRoots.get(root);

          _inertRoot.destructor();

          this._inertRoots['delete'](root);

          root.removeAttribute('inert');
        }
      }
      /**
       * Get the InertRoot object corresponding to the given inert root element, if any.
       * @param {!Node} element
       * @return {!InertRoot|undefined}
       */

    }, {
      key: 'getInertRoot',
      value: function getInertRoot(element) {
        return this._inertRoots.get(element);
      }
      /**
       * Register the given InertRoot as managing the given node.
       * In the case where the node has a previously existing inert root, this inert root will
       * be added to its set of inert roots.
       * @param {!Node} node
       * @param {!InertRoot} inertRoot
       * @return {!InertNode} inertNode
       */

    }, {
      key: 'register',
      value: function register(node, inertRoot) {
        var inertNode = this._managedNodes.get(node);

        if (inertNode !== undefined) {
          // node was already in an inert subtree
          inertNode.addInertRoot(inertRoot);
        } else {
          inertNode = new InertNode(node, inertRoot);
        }

        this._managedNodes.set(node, inertNode);

        return inertNode;
      }
      /**
       * De-register the given InertRoot as managing the given inert node.
       * Removes the inert root from the InertNode's set of managing inert roots, and remove the inert
       * node from the InertManager's set of managed nodes if it is destroyed.
       * If the node is not currently managed, this is essentially a no-op.
       * @param {!Node} node
       * @param {!InertRoot} inertRoot
       * @return {?InertNode} The potentially destroyed InertNode associated with this node, if any.
       */

    }, {
      key: 'deregister',
      value: function deregister(node, inertRoot) {
        var inertNode = this._managedNodes.get(node);

        if (!inertNode) {
          return null;
        }

        inertNode.removeInertRoot(inertRoot);

        if (inertNode.destroyed) {
          this._managedNodes['delete'](node);
        }

        return inertNode;
      }
      /**
       * Callback used when document has finished loading.
       */

    }, {
      key: '_onDocumentLoaded',
      value: function _onDocumentLoaded() {
        // Find all inert roots in document and make them actually inert.
        var inertElements = slice.call(this._document.querySelectorAll('[inert]'));
        inertElements.forEach(function (inertElement) {
          this.setInert(inertElement, true);
        }, this); // Comment this out to use programmatic API only.

        this._observer.observe(this._document.body || this._document.documentElement, {
          attributes: true,
          subtree: true,
          childList: true
        });
      }
      /**
       * Callback used when mutation observer detects attribute changes.
       * @param {!Array<!MutationRecord>} records
       * @param {!MutationObserver} self
       */

    }, {
      key: '_watchForInert',
      value: function _watchForInert(records, self) {
        var _this = this;

        records.forEach(function (record) {
          switch (record.type) {
            case 'childList':
              slice.call(record.addedNodes).forEach(function (node) {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                  return;
                }

                var inertElements = slice.call(node.querySelectorAll('[inert]'));

                if (matches.call(node, '[inert]')) {
                  inertElements.unshift(node);
                }

                inertElements.forEach(function (inertElement) {
                  this.setInert(inertElement, true);
                }, _this);
              }, _this);
              break;

            case 'attributes':
              if (record.attributeName !== 'inert') {
                return;
              }

              var target =
              /** @type {!Element} */
              record.target;
              var inert = target.hasAttribute('inert');

              _this.setInert(target, inert);

              break;
          }
        }, this);
      }
    }]);

    return InertManager;
  }();
  /**
   * Recursively walk the composed tree from |node|.
   * @param {!Node} node
   * @param {(function (!Element))=} callback Callback to be called for each element traversed,
   *     before descending into child nodes.
   * @param {?ShadowRoot=} shadowRootAncestor The nearest ShadowRoot ancestor, if any.
   */


  function composedTreeWalk(node, callback, shadowRootAncestor) {
    if (node.nodeType == Node.ELEMENT_NODE) {
      var element =
      /** @type {!Element} */
      node;

      if (callback) {
        callback(element);
      } // Descend into node:
      // If it has a ShadowRoot, ignore all child elements - these will be picked
      // up by the <content> or <shadow> elements. Descend straight into the
      // ShadowRoot.


      var shadowRoot =
      /** @type {!HTMLElement} */
      element.shadowRoot;

      if (shadowRoot) {
        composedTreeWalk(shadowRoot, callback);
        return;
      } // If it is a <content> element, descend into distributed elements - these
      // are elements from outside the shadow root which are rendered inside the
      // shadow DOM.


      if (element.localName == 'content') {
        var content =
        /** @type {!HTMLContentElement} */
        element; // Verifies if ShadowDom v0 is supported.

        var distributedNodes = content.getDistributedNodes ? content.getDistributedNodes() : [];

        for (var i = 0; i < distributedNodes.length; i++) {
          composedTreeWalk(distributedNodes[i], callback);
        }

        return;
      } // If it is a <slot> element, descend into assigned nodes - these
      // are elements from outside the shadow root which are rendered inside the
      // shadow DOM.


      if (element.localName == 'slot') {
        var slot =
        /** @type {!HTMLSlotElement} */
        element; // Verify if ShadowDom v1 is supported.

        var _distributedNodes = slot.assignedNodes ? slot.assignedNodes({
          flatten: true
        }) : [];

        for (var _i = 0; _i < _distributedNodes.length; _i++) {
          composedTreeWalk(_distributedNodes[_i], callback);
        }

        return;
      }
    } // If it is neither the parent of a ShadowRoot, a <content> element, a <slot>
    // element, nor a <shadow> element recurse normally.


    var child = node.firstChild;

    while (child != null) {
      composedTreeWalk(child, callback);
      child = child.nextSibling;
    }
  }
  /**
   * Adds a style element to the node containing the inert specific styles
   * @param {!Node} node
   */


  function addInertStyle(node) {
    if (node.querySelector('style#inert-style, link#inert-style')) {
      return;
    }

    var style = document.createElement('style');
    style.setAttribute('id', 'inert-style');
    style.textContent = '\n' + '[inert] {\n' + '  pointer-events: none;\n' + '  cursor: default;\n' + '}\n' + '\n' + '[inert], [inert] * {\n' + '  -webkit-user-select: none;\n' + '  -moz-user-select: none;\n' + '  -ms-user-select: none;\n' + '  user-select: none;\n' + '}\n';
    node.appendChild(style);
  }

  if (!Element.prototype.hasOwnProperty('inert')) {
    /** @type {!InertManager} */
    var inertManager = new InertManager(document);
    Object.defineProperty(Element.prototype, 'inert', {
      enumerable: true,

      /** @this {!Element} */
      get: function get() {
        return this.hasAttribute('inert');
      },

      /** @this {!Element} */
      set: function set(inert) {
        inertManager.setInert(this, inert);
      }
    });
  }
})(); // packages/alpinejs/src/scheduler.js


var flushPending = false;
var flushing = false;
var queue = [];

function scheduler(callback) {
  queueJob(callback);
}

function queueJob(job) {
  if (!queue.includes(job)) queue.push(job);
  queueFlush();
}

function dequeueJob(job) {
  let index = queue.indexOf(job);
  if (index !== -1) queue.splice(index, 1);
}

function queueFlush() {
  if (!flushing && !flushPending) {
    flushPending = true;
    queueMicrotask(flushJobs);
  }
}

function flushJobs() {
  flushPending = false;
  flushing = true;

  for (let i = 0; i < queue.length; i++) {
    queue[i]();
  }

  queue.length = 0;
  flushing = false;
} // packages/alpinejs/src/reactivity.js


var reactive;
var effect;
var release;
var raw;
var shouldSchedule = true;

function disableEffectScheduling(callback) {
  shouldSchedule = false;
  callback();
  shouldSchedule = true;
}

function setReactivityEngine(engine) {
  reactive = engine.reactive;
  release = engine.release;

  effect = callback => engine.effect(callback, {
    scheduler: task => {
      if (shouldSchedule) {
        scheduler(task);
      } else {
        task();
      }
    }
  });

  raw = engine.raw;
}

function overrideEffect(override) {
  effect = override;
}

function elementBoundEffect(el) {
  let cleanup2 = () => {};

  let wrappedEffect = callback => {
    let effectReference = effect(callback);

    if (!el._x_effects) {
      el._x_effects = new Set();

      el._x_runEffects = () => {
        el._x_effects.forEach(i => i());
      };
    }

    el._x_effects.add(effectReference);

    cleanup2 = () => {
      if (effectReference === void 0) return;

      el._x_effects.delete(effectReference);

      release(effectReference);
    };

    return effectReference;
  };

  return [wrappedEffect, () => {
    cleanup2();
  }];
} // packages/alpinejs/src/mutation.js


var onAttributeAddeds = [];
var onElRemoveds = [];
var onElAddeds = [];

function onElAdded(callback) {
  onElAddeds.push(callback);
}

function onElRemoved(el, callback) {
  if (typeof callback === "function") {
    if (!el._x_cleanups) el._x_cleanups = [];

    el._x_cleanups.push(callback);
  } else {
    callback = el;
    onElRemoveds.push(callback);
  }
}

function onAttributesAdded(callback) {
  onAttributeAddeds.push(callback);
}

function onAttributeRemoved(el, name, callback) {
  if (!el._x_attributeCleanups) el._x_attributeCleanups = {};
  if (!el._x_attributeCleanups[name]) el._x_attributeCleanups[name] = [];

  el._x_attributeCleanups[name].push(callback);
}

function cleanupAttributes(el, names) {
  if (!el._x_attributeCleanups) return;
  Object.entries(el._x_attributeCleanups).forEach(_ref4 => {
    let [name, value] = _ref4;

    if (names === void 0 || names.includes(name)) {
      value.forEach(i => i());
      delete el._x_attributeCleanups[name];
    }
  });
}

var observer = new MutationObserver(onMutate);
var currentlyObserving = false;

function startObservingMutations() {
  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true
  });
  currentlyObserving = true;
}

function stopObservingMutations() {
  flushObserver();
  observer.disconnect();
  currentlyObserving = false;
}

var recordQueue = [];
var willProcessRecordQueue = false;

function flushObserver() {
  recordQueue = recordQueue.concat(observer.takeRecords());

  if (recordQueue.length && !willProcessRecordQueue) {
    willProcessRecordQueue = true;
    queueMicrotask(() => {
      processRecordQueue();
      willProcessRecordQueue = false;
    });
  }
}

function processRecordQueue() {
  onMutate(recordQueue);
  recordQueue.length = 0;
}

function mutateDom(callback) {
  if (!currentlyObserving) return callback();
  stopObservingMutations();
  let result = callback();
  startObservingMutations();
  return result;
}

var isCollecting = false;
var deferredMutations = [];

function deferMutations() {
  isCollecting = true;
}

function flushAndStopDeferringMutations() {
  isCollecting = false;
  onMutate(deferredMutations);
  deferredMutations = [];
}

function onMutate(mutations) {
  if (isCollecting) {
    deferredMutations = deferredMutations.concat(mutations);
    return;
  }

  let addedNodes = [];
  let removedNodes = [];
  let addedAttributes = new Map();
  let removedAttributes = new Map();

  for (let i = 0; i < mutations.length; i++) {
    if (mutations[i].target._x_ignoreMutationObserver) continue;

    if (mutations[i].type === "childList") {
      mutations[i].addedNodes.forEach(node => node.nodeType === 1 && addedNodes.push(node));
      mutations[i].removedNodes.forEach(node => node.nodeType === 1 && removedNodes.push(node));
    }

    if (mutations[i].type === "attributes") {
      let el = mutations[i].target;
      let name = mutations[i].attributeName;
      let oldValue = mutations[i].oldValue;

      let add2 = () => {
        if (!addedAttributes.has(el)) addedAttributes.set(el, []);
        addedAttributes.get(el).push({
          name,
          value: el.getAttribute(name)
        });
      };

      let remove = () => {
        if (!removedAttributes.has(el)) removedAttributes.set(el, []);
        removedAttributes.get(el).push(name);
      };

      if (el.hasAttribute(name) && oldValue === null) {
        add2();
      } else if (el.hasAttribute(name)) {
        remove();
        add2();
      } else {
        remove();
      }
    }
  }

  removedAttributes.forEach((attrs, el) => {
    cleanupAttributes(el, attrs);
  });
  addedAttributes.forEach((attrs, el) => {
    onAttributeAddeds.forEach(i => i(el, attrs));
  });

  for (let node of removedNodes) {
    if (addedNodes.includes(node)) continue;
    onElRemoveds.forEach(i => i(node));

    if (node._x_cleanups) {
      while (node._x_cleanups.length) node._x_cleanups.pop()();
    }
  }

  addedNodes.forEach(node => {
    node._x_ignoreSelf = true;
    node._x_ignore = true;
  });

  for (let node of addedNodes) {
    if (removedNodes.includes(node)) continue;
    if (!node.isConnected) continue;
    delete node._x_ignoreSelf;
    delete node._x_ignore;
    onElAddeds.forEach(i => i(node));
    node._x_ignore = true;
    node._x_ignoreSelf = true;
  }

  addedNodes.forEach(node => {
    delete node._x_ignoreSelf;
    delete node._x_ignore;
  });
  addedNodes = null;
  removedNodes = null;
  addedAttributes = null;
  removedAttributes = null;
} // packages/alpinejs/src/scope.js


function scope(node) {
  return mergeProxies(closestDataStack(node));
}

function addScopeToNode(node, data2, referenceNode) {
  node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
  return () => {
    node._x_dataStack = node._x_dataStack.filter(i => i !== data2);
  };
}

function refreshScope(element, scope2) {
  let existingScope = element._x_dataStack[0];
  Object.entries(scope2).forEach(_ref5 => {
    let [key, value] = _ref5;
    existingScope[key] = value;
  });
}

function closestDataStack(node) {
  if (node._x_dataStack) return node._x_dataStack;

  if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
    return closestDataStack(node.host);
  }

  if (!node.parentNode) {
    return [];
  }

  return closestDataStack(node.parentNode);
}

function mergeProxies(objects) {
  let thisProxy = new Proxy({}, {
    ownKeys: () => {
      return Array.from(new Set(objects.flatMap(i => Object.keys(i))));
    },
    has: (target, name) => {
      return objects.some(obj => obj.hasOwnProperty(name));
    },
    get: (target, name) => {
      return (objects.find(obj => {
        if (obj.hasOwnProperty(name)) {
          let descriptor = Object.getOwnPropertyDescriptor(obj, name);

          if (descriptor.get && descriptor.get._x_alreadyBound || descriptor.set && descriptor.set._x_alreadyBound) {
            return true;
          }

          if ((descriptor.get || descriptor.set) && descriptor.enumerable) {
            let getter = descriptor.get;
            let setter = descriptor.set;
            let property = descriptor;
            getter = getter && getter.bind(thisProxy);
            setter = setter && setter.bind(thisProxy);
            if (getter) getter._x_alreadyBound = true;
            if (setter) setter._x_alreadyBound = true;
            Object.defineProperty(obj, name, { ...property,
              get: getter,
              set: setter
            });
          }

          return true;
        }

        return false;
      }) || {})[name];
    },
    set: (target, name, value) => {
      let closestObjectWithKey = objects.find(obj => obj.hasOwnProperty(name));

      if (closestObjectWithKey) {
        closestObjectWithKey[name] = value;
      } else {
        objects[objects.length - 1][name] = value;
      }

      return true;
    }
  });
  return thisProxy;
} // packages/alpinejs/src/interceptor.js


function initInterceptors(data2) {
  let isObject2 = val => typeof val === "object" && !Array.isArray(val) && val !== null;

  let recurse = function (obj) {
    let basePath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
    Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(_ref6 => {
      let [key, {
        value,
        enumerable
      }] = _ref6;
      if (enumerable === false || value === void 0) return;
      let path = basePath === "" ? key : `${basePath}.${key}`;

      if (typeof value === "object" && value !== null && value._x_interceptor) {
        obj[key] = value.initialize(data2, path, key);
      } else {
        if (isObject2(value) && value !== obj && !(value instanceof Element)) {
          recurse(value, path);
        }
      }
    });
  };

  return recurse(data2);
}

function interceptor(callback) {
  let mutateObj = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => {};
  let obj = {
    initialValue: void 0,
    _x_interceptor: true,

    initialize(data2, path, key) {
      return callback(this.initialValue, () => get(data2, path), value => set(data2, path, value), path, key);
    }

  };
  mutateObj(obj);
  return initialValue => {
    if (typeof initialValue === "object" && initialValue !== null && initialValue._x_interceptor) {
      let initialize = obj.initialize.bind(obj);

      obj.initialize = (data2, path, key) => {
        let innerValue = initialValue.initialize(data2, path, key);
        obj.initialValue = innerValue;
        return initialize(data2, path, key);
      };
    } else {
      obj.initialValue = initialValue;
    }

    return obj;
  };
}

function get(obj, path) {
  return path.split(".").reduce((carry, segment) => carry[segment], obj);
}

function set(obj, path, value) {
  if (typeof path === "string") path = path.split(".");
  if (path.length === 1) obj[path[0]] = value;else if (path.length === 0) throw error;else {
    if (obj[path[0]]) return set(obj[path[0]], path.slice(1), value);else {
      obj[path[0]] = {};
      return set(obj[path[0]], path.slice(1), value);
    }
  }
} // packages/alpinejs/src/magics.js


var magics = {};

function magic(name, callback) {
  magics[name] = callback;
}

function injectMagics(obj, el) {
  Object.entries(magics).forEach(_ref7 => {
    let [name, callback] = _ref7;
    Object.defineProperty(obj, `$${name}`, {
      get() {
        let [utilities, cleanup2] = getElementBoundUtilities(el);
        utilities = {
          interceptor,
          ...utilities
        };
        onElRemoved(el, cleanup2);
        return callback(el, utilities);
      },

      enumerable: false
    });
  });
  return obj;
} // packages/alpinejs/src/utils/error.js


function tryCatch(el, expression, callback) {
  try {
    for (var _len2 = arguments.length, args = new Array(_len2 > 3 ? _len2 - 3 : 0), _key2 = 3; _key2 < _len2; _key2++) {
      args[_key2 - 3] = arguments[_key2];
    }

    return callback(...args);
  } catch (e) {
    handleError(e, el, expression);
  }
}

function handleError(error2, el) {
  let expression = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : void 0;
  Object.assign(error2, {
    el,
    expression
  });
  console.warn(`Alpine Expression Error: ${error2.message}

${expression ? 'Expression: "' + expression + '"\n\n' : ""}`, el);
  setTimeout(() => {
    throw error2;
  }, 0);
} // packages/alpinejs/src/evaluator.js


function evaluate(el, expression) {
  let extras = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let result;
  evaluateLater(el, expression)(value => result = value, extras);
  return result;
}

function evaluateLater() {
  return theEvaluatorFunction(...arguments);
}

var theEvaluatorFunction = normalEvaluator;

function setEvaluator(newEvaluator) {
  theEvaluatorFunction = newEvaluator;
}

function normalEvaluator(el, expression) {
  let overriddenMagics = {};
  injectMagics(overriddenMagics, el);
  let dataStack = [overriddenMagics, ...closestDataStack(el)];

  if (typeof expression === "function") {
    return generateEvaluatorFromFunction(dataStack, expression);
  }

  let evaluator = generateEvaluatorFromString(dataStack, expression, el);
  return tryCatch.bind(null, el, expression, evaluator);
}

function generateEvaluatorFromFunction(dataStack, func) {
  return function () {
    let receiver = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : () => {};
    let {
      scope: scope2 = {},
      params = []
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
    runIfTypeOfFunction(receiver, result);
  };
}

var evaluatorMemo = {};

function generateFunctionFromString(expression, el) {
  if (evaluatorMemo[expression]) {
    return evaluatorMemo[expression];
  }

  let AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression) || /^(let|const)\s/.test(expression) ? `(() => { ${expression} })()` : expression;

  const safeAsyncFunction = () => {
    try {
      return new AsyncFunction(["__self", "scope"], `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`);
    } catch (error2) {
      handleError(error2, el, expression);
      return Promise.resolve();
    }
  };

  let func = safeAsyncFunction();
  evaluatorMemo[expression] = func;
  return func;
}

function generateEvaluatorFromString(dataStack, expression, el) {
  let func = generateFunctionFromString(expression, el);
  return function () {
    let receiver = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : () => {};
    let {
      scope: scope2 = {},
      params = []
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    func.result = void 0;
    func.finished = false;
    let completeScope = mergeProxies([scope2, ...dataStack]);

    if (typeof func === "function") {
      let promise = func(func, completeScope).catch(error2 => handleError(error2, el, expression));

      if (func.finished) {
        runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
        func.result = void 0;
      } else {
        promise.then(result => {
          runIfTypeOfFunction(receiver, result, completeScope, params, el);
        }).catch(error2 => handleError(error2, el, expression)).finally(() => func.result = void 0);
      }
    }
  };
}

function runIfTypeOfFunction(receiver, value, scope2, params, el) {
  if (typeof value === "function") {
    let result = value.apply(scope2, params);

    if (result instanceof Promise) {
      result.then(i => runIfTypeOfFunction(receiver, i, scope2, params)).catch(error2 => handleError(error2, el, value));
    } else {
      receiver(result);
    }
  } else {
    receiver(value);
  }
} // packages/alpinejs/src/directives.js


var prefixAsString = "x-";

function prefix() {
  let subject = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
  return prefixAsString + subject;
}

function setPrefix(newPrefix) {
  prefixAsString = newPrefix;
}

var directiveHandlers = {};

function directive(name, callback) {
  directiveHandlers[name] = callback;
}

function directives(el, attributes, originalAttributeOverride) {
  let transformedAttributeMap = {};
  let directives2 = Array.from(attributes).map(toTransformedAttributes((newName, oldName) => transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
  return directives2.map(directive2 => {
    return getDirectiveHandler(el, directive2);
  });
}

function attributesOnly(attributes) {
  return Array.from(attributes).map(toTransformedAttributes()).filter(attr => !outNonAlpineAttributes(attr));
}

var isDeferringHandlers = false;
var directiveHandlerStacks = new Map();
var currentHandlerStackKey = Symbol();

function deferHandlingDirectives(callback) {
  isDeferringHandlers = true;
  let key = Symbol();
  currentHandlerStackKey = key;
  directiveHandlerStacks.set(key, []);

  let flushHandlers = () => {
    while (directiveHandlerStacks.get(key).length) directiveHandlerStacks.get(key).shift()();

    directiveHandlerStacks.delete(key);
  };

  let stopDeferring = () => {
    isDeferringHandlers = false;
    flushHandlers();
  };

  callback(flushHandlers);
  stopDeferring();
}

function getElementBoundUtilities(el) {
  let cleanups = [];

  let cleanup2 = callback => cleanups.push(callback);

  let [effect3, cleanupEffect] = elementBoundEffect(el);
  cleanups.push(cleanupEffect);
  let utilities = {
    Alpine: alpine_default,
    effect: effect3,
    cleanup: cleanup2,
    evaluateLater: evaluateLater.bind(evaluateLater, el),
    evaluate: evaluate.bind(evaluate, el)
  };

  let doCleanup = () => cleanups.forEach(i => i());

  return [utilities, doCleanup];
}

function getDirectiveHandler(el, directive2) {
  let noop = () => {};

  let handler3 = directiveHandlers[directive2.type] || noop;
  let [utilities, cleanup2] = getElementBoundUtilities(el);
  onAttributeRemoved(el, directive2.original, cleanup2);

  let fullHandler = () => {
    if (el._x_ignore || el._x_ignoreSelf) return;
    handler3.inline && handler3.inline(el, directive2, utilities);
    handler3 = handler3.bind(handler3, el, directive2, utilities);
    isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler3) : handler3();
  };

  fullHandler.runCleanups = cleanup2;
  return fullHandler;
}

var startingWith = (subject, replacement) => _ref8 => {
  let {
    name,
    value
  } = _ref8;
  if (name.startsWith(subject)) name = name.replace(subject, replacement);
  return {
    name,
    value
  };
};

var into = i => i;

function toTransformedAttributes() {
  let callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : () => {};
  return _ref9 => {
    let {
      name,
      value
    } = _ref9;
    let {
      name: newName,
      value: newValue
    } = attributeTransformers.reduce((carry, transform) => {
      return transform(carry);
    }, {
      name,
      value
    });
    if (newName !== name) callback(newName, name);
    return {
      name: newName,
      value: newValue
    };
  };
}

var attributeTransformers = [];

function mapAttributes(callback) {
  attributeTransformers.push(callback);
}

function outNonAlpineAttributes(_ref10) {
  let {
    name
  } = _ref10;
  return alpineAttributeRegex().test(name);
}

var alpineAttributeRegex = () => new RegExp(`^${prefixAsString}([^:^.]+)\\b`);

function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
  return _ref11 => {
    let {
      name,
      value
    } = _ref11;
    let typeMatch = name.match(alpineAttributeRegex());
    let valueMatch = name.match(/:([a-zA-Z0-9\-:]+)/);
    let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
    let original = originalAttributeOverride || transformedAttributeMap[name] || name;
    return {
      type: typeMatch ? typeMatch[1] : null,
      value: valueMatch ? valueMatch[1] : null,
      modifiers: modifiers.map(i => i.replace(".", "")),
      expression: value,
      original
    };
  };
}

var DEFAULT = "DEFAULT";
var directiveOrder = ["ignore", "ref", "data", "id", "bind", "init", "for", "model", "modelable", "transition", "show", "if", DEFAULT, "teleport", "element"];

function byPriority(a, b) {
  let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
  let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
  return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
} // packages/alpinejs/src/utils/dispatch.js


function dispatch(el, name) {
  let detail = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  el.dispatchEvent(new CustomEvent(name, {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true
  }));
} // packages/alpinejs/src/nextTick.js


var tickStack = [];
var isHolding = false;

function nextTick(callback) {
  tickStack.push(callback);
  queueMicrotask(() => {
    isHolding || setTimeout(() => {
      releaseNextTicks();
    });
  });
}

function releaseNextTicks() {
  isHolding = false;

  while (tickStack.length) tickStack.shift()();
}

function holdNextTicks() {
  isHolding = true;
} // packages/alpinejs/src/utils/walk.js


function walk(el, callback) {
  if (typeof ShadowRoot === "function" && el instanceof ShadowRoot) {
    Array.from(el.children).forEach(el2 => walk(el2, callback));
    return;
  }

  let skip = false;
  callback(el, () => skip = true);
  if (skip) return;
  let node = el.firstElementChild;

  while (node) {
    walk(node, callback);
    node = node.nextElementSibling;
  }
} // packages/alpinejs/src/utils/warn.js


function warn(message) {
  for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    args[_key3 - 1] = arguments[_key3];
  }

  console.warn(`Alpine Warning: ${message}`, ...args);
} // packages/alpinejs/src/lifecycle.js


function start() {
  if (!document.body) warn("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
  dispatch(document, "alpine:init");
  dispatch(document, "alpine:initializing");
  startObservingMutations();
  onElAdded(el => initTree(el, walk));
  onElRemoved(el => destroyTree(el));
  onAttributesAdded((el, attrs) => {
    directives(el, attrs).forEach(handle => handle());
  });

  let outNestedComponents = el => !closestRoot(el.parentElement, true);

  Array.from(document.querySelectorAll(allSelectors())).filter(outNestedComponents).forEach(el => {
    initTree(el);
  });
  dispatch(document, "alpine:initialized");
}

var rootSelectorCallbacks = [];
var initSelectorCallbacks = [];

function rootSelectors() {
  return rootSelectorCallbacks.map(fn => fn());
}

function allSelectors() {
  return rootSelectorCallbacks.concat(initSelectorCallbacks).map(fn => fn());
}

function addRootSelector(selectorCallback) {
  rootSelectorCallbacks.push(selectorCallback);
}

function addInitSelector(selectorCallback) {
  initSelectorCallbacks.push(selectorCallback);
}

function closestRoot(el) {
  let includeInitSelectors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  return findClosest(el, element => {
    const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
    if (selectors.some(selector => element.matches(selector))) return true;
  });
}

function findClosest(el, callback) {
  if (!el) return;
  if (callback(el)) return el;
  if (el._x_teleportBack) el = el._x_teleportBack;
  if (!el.parentElement) return;
  return findClosest(el.parentElement, callback);
}

function isRoot(el) {
  return rootSelectors().some(selector => el.matches(selector));
}

function initTree(el) {
  let walker = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : walk;
  deferHandlingDirectives(() => {
    walker(el, (el2, skip) => {
      directives(el2, el2.attributes).forEach(handle => handle());
      el2._x_ignore && skip();
    });
  });
}

function destroyTree(root) {
  walk(root, el => cleanupAttributes(el));
} // packages/alpinejs/src/utils/classes.js


function setClasses(el, value) {
  if (Array.isArray(value)) {
    return setClassesFromString(el, value.join(" "));
  } else if (typeof value === "object" && value !== null) {
    return setClassesFromObject(el, value);
  } else if (typeof value === "function") {
    return setClasses(el, value());
  }

  return setClassesFromString(el, value);
}

function setClassesFromString(el, classString) {
  let missingClasses = classString2 => classString2.split(" ").filter(i => !el.classList.contains(i)).filter(Boolean);

  let addClassesAndReturnUndo = classes => {
    el.classList.add(...classes);
    return () => {
      el.classList.remove(...classes);
    };
  };

  classString = classString === true ? classString = "" : classString || "";
  return addClassesAndReturnUndo(missingClasses(classString));
}

function setClassesFromObject(el, classObject) {
  let split = classString => classString.split(" ").filter(Boolean);

  let forAdd = Object.entries(classObject).flatMap(_ref12 => {
    let [classString, bool] = _ref12;
    return bool ? split(classString) : false;
  }).filter(Boolean);
  let forRemove = Object.entries(classObject).flatMap(_ref13 => {
    let [classString, bool] = _ref13;
    return !bool ? split(classString) : false;
  }).filter(Boolean);
  let added = [];
  let removed = [];
  forRemove.forEach(i => {
    if (el.classList.contains(i)) {
      el.classList.remove(i);
      removed.push(i);
    }
  });
  forAdd.forEach(i => {
    if (!el.classList.contains(i)) {
      el.classList.add(i);
      added.push(i);
    }
  });
  return () => {
    removed.forEach(i => el.classList.add(i));
    added.forEach(i => el.classList.remove(i));
  };
} // packages/alpinejs/src/utils/styles.js


function setStyles(el, value) {
  if (typeof value === "object" && value !== null) {
    return setStylesFromObject(el, value);
  }

  return setStylesFromString(el, value);
}

function setStylesFromObject(el, value) {
  let previousStyles = {};
  Object.entries(value).forEach(_ref14 => {
    let [key, value2] = _ref14;
    previousStyles[key] = el.style[key];

    if (!key.startsWith("--")) {
      key = kebabCase(key);
    }

    el.style.setProperty(key, value2);
  });
  setTimeout(() => {
    if (el.style.length === 0) {
      el.removeAttribute("style");
    }
  });
  return () => {
    setStyles(el, previousStyles);
  };
}

function setStylesFromString(el, value) {
  let cache = el.getAttribute("style", value);
  el.setAttribute("style", value);
  return () => {
    el.setAttribute("style", cache || "");
  };
}

function kebabCase(subject) {
  return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
} // packages/alpinejs/src/utils/once.js


function once(callback) {
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => {};
  let called = false;
  return function () {
    if (!called) {
      called = true;
      callback.apply(this, arguments);
    } else {
      fallback.apply(this, arguments);
    }
  };
} // packages/alpinejs/src/directives/x-transition.js


directive("transition", (el, _ref15, _ref16) => {
  let {
    value,
    modifiers,
    expression
  } = _ref15;
  let {
    evaluate: evaluate2
  } = _ref16;
  if (typeof expression === "function") expression = evaluate2(expression);

  if (!expression) {
    registerTransitionsFromHelper(el, modifiers, value);
  } else {
    registerTransitionsFromClassString(el, expression, value);
  }
});

function registerTransitionsFromClassString(el, classString, stage) {
  registerTransitionObject(el, setClasses, "");
  let directiveStorageMap = {
    enter: classes => {
      el._x_transition.enter.during = classes;
    },
    "enter-start": classes => {
      el._x_transition.enter.start = classes;
    },
    "enter-end": classes => {
      el._x_transition.enter.end = classes;
    },
    leave: classes => {
      el._x_transition.leave.during = classes;
    },
    "leave-start": classes => {
      el._x_transition.leave.start = classes;
    },
    "leave-end": classes => {
      el._x_transition.leave.end = classes;
    }
  };
  directiveStorageMap[stage](classString);
}

function registerTransitionsFromHelper(el, modifiers, stage) {
  registerTransitionObject(el, setStyles);
  let doesntSpecify = !modifiers.includes("in") && !modifiers.includes("out") && !stage;
  let transitioningIn = doesntSpecify || modifiers.includes("in") || ["enter"].includes(stage);
  let transitioningOut = doesntSpecify || modifiers.includes("out") || ["leave"].includes(stage);

  if (modifiers.includes("in") && !doesntSpecify) {
    modifiers = modifiers.filter((i, index) => index < modifiers.indexOf("out"));
  }

  if (modifiers.includes("out") && !doesntSpecify) {
    modifiers = modifiers.filter((i, index) => index > modifiers.indexOf("out"));
  }

  let wantsAll = !modifiers.includes("opacity") && !modifiers.includes("scale");
  let wantsOpacity = wantsAll || modifiers.includes("opacity");
  let wantsScale = wantsAll || modifiers.includes("scale");
  let opacityValue = wantsOpacity ? 0 : 1;
  let scaleValue = wantsScale ? modifierValue$1(modifiers, "scale", 95) / 100 : 1;
  let delay = modifierValue$1(modifiers, "delay", 0);
  let origin = modifierValue$1(modifiers, "origin", "center");
  let property = "opacity, transform";
  let durationIn = modifierValue$1(modifiers, "duration", 150) / 1e3;
  let durationOut = modifierValue$1(modifiers, "duration", 75) / 1e3;
  let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;

  if (transitioningIn) {
    el._x_transition.enter.during = {
      transformOrigin: origin,
      transitionDelay: delay,
      transitionProperty: property,
      transitionDuration: `${durationIn}s`,
      transitionTimingFunction: easing
    };
    el._x_transition.enter.start = {
      opacity: opacityValue,
      transform: `scale(${scaleValue})`
    };
    el._x_transition.enter.end = {
      opacity: 1,
      transform: `scale(1)`
    };
  }

  if (transitioningOut) {
    el._x_transition.leave.during = {
      transformOrigin: origin,
      transitionDelay: delay,
      transitionProperty: property,
      transitionDuration: `${durationOut}s`,
      transitionTimingFunction: easing
    };
    el._x_transition.leave.start = {
      opacity: 1,
      transform: `scale(1)`
    };
    el._x_transition.leave.end = {
      opacity: opacityValue,
      transform: `scale(${scaleValue})`
    };
  }
}

function registerTransitionObject(el, setFunction) {
  let defaultValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!el._x_transition) el._x_transition = {
    enter: {
      during: defaultValue,
      start: defaultValue,
      end: defaultValue
    },
    leave: {
      during: defaultValue,
      start: defaultValue,
      end: defaultValue
    },

    in() {
      let before = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : () => {};
      let after = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => {};
      transition(el, setFunction, {
        during: this.enter.during,
        start: this.enter.start,
        end: this.enter.end
      }, before, after);
    },

    out() {
      let before = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : () => {};
      let after = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => {};
      transition(el, setFunction, {
        during: this.leave.during,
        start: this.leave.start,
        end: this.leave.end
      }, before, after);
    }

  };
}

window.Element.prototype._x_toggleAndCascadeWithTransitions = function (el, value, show, hide) {
  let clickAwayCompatibleShow = () => {
    document.visibilityState === "visible" ? requestAnimationFrame(show) : setTimeout(show);
  };

  if (value) {
    if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
      el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
    } else {
      el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
    }

    return;
  }

  el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) => {
    el._x_transition.out(() => {}, () => resolve(hide));

    el._x_transitioning.beforeCancel(() => reject({
      isFromCancelledTransition: true
    }));
  }) : Promise.resolve(hide);
  queueMicrotask(() => {
    let closest = closestHide(el);

    if (closest) {
      if (!closest._x_hideChildren) closest._x_hideChildren = [];

      closest._x_hideChildren.push(el);
    } else {
      queueMicrotask(() => {
        let hideAfterChildren = el2 => {
          let carry = Promise.all([el2._x_hidePromise, ...(el2._x_hideChildren || []).map(hideAfterChildren)]).then(_ref17 => {
            let [i] = _ref17;
            return i();
          });
          delete el2._x_hidePromise;
          delete el2._x_hideChildren;
          return carry;
        };

        hideAfterChildren(el).catch(e => {
          if (!e.isFromCancelledTransition) throw e;
        });
      });
    }
  });
};

function closestHide(el) {
  let parent = el.parentNode;
  if (!parent) return;
  return parent._x_hidePromise ? parent : closestHide(parent);
}

function transition(el, setFunction) {
  let {
    during,
    start: start2,
    end
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let before = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : () => {};
  let after = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : () => {};
  if (el._x_transitioning) el._x_transitioning.cancel();

  if (Object.keys(during).length === 0 && Object.keys(start2).length === 0 && Object.keys(end).length === 0) {
    before();
    after();
    return;
  }

  let undoStart, undoDuring, undoEnd;
  performTransition(el, {
    start() {
      undoStart = setFunction(el, start2);
    },

    during() {
      undoDuring = setFunction(el, during);
    },

    before,

    end() {
      undoStart();
      undoEnd = setFunction(el, end);
    },

    after,

    cleanup() {
      undoDuring();
      undoEnd();
    }

  });
}

function performTransition(el, stages) {
  let interrupted, reachedBefore, reachedEnd;
  let finish = once(() => {
    mutateDom(() => {
      interrupted = true;
      if (!reachedBefore) stages.before();

      if (!reachedEnd) {
        stages.end();
        releaseNextTicks();
      }

      stages.after();
      if (el.isConnected) stages.cleanup();
      delete el._x_transitioning;
    });
  });
  el._x_transitioning = {
    beforeCancels: [],

    beforeCancel(callback) {
      this.beforeCancels.push(callback);
    },

    cancel: once(function () {
      while (this.beforeCancels.length) {
        this.beforeCancels.shift()();
      }

      finish();
    }),
    finish
  };
  mutateDom(() => {
    stages.start();
    stages.during();
  });
  holdNextTicks();
  requestAnimationFrame(() => {
    if (interrupted) return;
    let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3;
    let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3;
    if (duration === 0) duration = Number(getComputedStyle(el).animationDuration.replace("s", "")) * 1e3;
    mutateDom(() => {
      stages.before();
    });
    reachedBefore = true;
    requestAnimationFrame(() => {
      if (interrupted) return;
      mutateDom(() => {
        stages.end();
      });
      releaseNextTicks();
      setTimeout(el._x_transitioning.finish, duration + delay);
      reachedEnd = true;
    });
  });
}

function modifierValue$1(modifiers, key, fallback) {
  if (modifiers.indexOf(key) === -1) return fallback;
  const rawValue = modifiers[modifiers.indexOf(key) + 1];
  if (!rawValue) return fallback;

  if (key === "scale") {
    if (isNaN(rawValue)) return fallback;
  }

  if (key === "duration") {
    let match = rawValue.match(/([0-9]+)ms/);
    if (match) return match[1];
  }

  if (key === "origin") {
    if (["top", "right", "left", "center", "bottom"].includes(modifiers[modifiers.indexOf(key) + 2])) {
      return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(" ");
    }
  }

  return rawValue;
} // packages/alpinejs/src/clone.js


var isCloning = false;

function skipDuringClone(callback) {
  let fallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => {};
  return function () {
    return isCloning ? fallback(...arguments) : callback(...arguments);
  };
}

function clone(oldEl, newEl) {
  if (!newEl._x_dataStack) newEl._x_dataStack = oldEl._x_dataStack;
  isCloning = true;
  dontRegisterReactiveSideEffects(() => {
    cloneTree(newEl);
  });
  isCloning = false;
}

function cloneTree(el) {
  let hasRunThroughFirstEl = false;

  let shallowWalker = (el2, callback) => {
    walk(el2, (el3, skip) => {
      if (hasRunThroughFirstEl && isRoot(el3)) return skip();
      hasRunThroughFirstEl = true;
      callback(el3, skip);
    });
  };

  initTree(el, shallowWalker);
}

function dontRegisterReactiveSideEffects(callback) {
  let cache = effect;
  overrideEffect((callback2, el) => {
    let storedEffect = cache(callback2);
    release(storedEffect);
    return () => {};
  });
  callback();
  overrideEffect(cache);
} // packages/alpinejs/src/utils/bind.js


function bind(el, name, value) {
  let modifiers = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
  if (!el._x_bindings) el._x_bindings = reactive({});
  el._x_bindings[name] = value;
  name = modifiers.includes("camel") ? camelCase(name) : name;

  switch (name) {
    case "value":
      bindInputValue(el, value);
      break;

    case "style":
      bindStyles(el, value);
      break;

    case "class":
      bindClasses(el, value);
      break;

    default:
      bindAttribute(el, name, value);
      break;
  }
}

function bindInputValue(el, value) {
  if (el.type === "radio") {
    if (el.attributes.value === void 0) {
      el.value = value;
    }

    if (window.fromModel) {
      el.checked = checkedAttrLooseCompare(el.value, value);
    }
  } else if (el.type === "checkbox") {
    if (Number.isInteger(value)) {
      el.value = value;
    } else if (!Number.isInteger(value) && !Array.isArray(value) && typeof value !== "boolean" && ![null, void 0].includes(value)) {
      el.value = String(value);
    } else {
      if (Array.isArray(value)) {
        el.checked = value.some(val => checkedAttrLooseCompare(val, el.value));
      } else {
        el.checked = !!value;
      }
    }
  } else if (el.tagName === "SELECT") {
    updateSelect(el, value);
  } else {
    if (el.value === value) return;
    el.value = value;
  }
}

function bindClasses(el, value) {
  if (el._x_undoAddedClasses) el._x_undoAddedClasses();
  el._x_undoAddedClasses = setClasses(el, value);
}

function bindStyles(el, value) {
  if (el._x_undoAddedStyles) el._x_undoAddedStyles();
  el._x_undoAddedStyles = setStyles(el, value);
}

function bindAttribute(el, name, value) {
  if ([null, void 0, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
    el.removeAttribute(name);
  } else {
    if (isBooleanAttr(name)) value = name;
    setIfChanged(el, name, value);
  }
}

function setIfChanged(el, attrName, value) {
  if (el.getAttribute(attrName) != value) {
    el.setAttribute(attrName, value);
  }
}

function updateSelect(el, value) {
  const arrayWrappedValue = [].concat(value).map(value2 => {
    return value2 + "";
  });
  Array.from(el.options).forEach(option => {
    option.selected = arrayWrappedValue.includes(option.value);
  });
}

function camelCase(subject) {
  return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
}

function checkedAttrLooseCompare(valueA, valueB) {
  return valueA == valueB;
}

function isBooleanAttr(attrName) {
  const booleanAttributes = ["disabled", "checked", "required", "readonly", "hidden", "open", "selected", "autofocus", "itemscope", "multiple", "novalidate", "allowfullscreen", "allowpaymentrequest", "formnovalidate", "autoplay", "controls", "loop", "muted", "playsinline", "default", "ismap", "reversed", "async", "defer", "nomodule"];
  return booleanAttributes.includes(attrName);
}

function attributeShouldntBePreservedIfFalsy(name) {
  return !["aria-pressed", "aria-checked", "aria-expanded", "aria-selected"].includes(name);
}

function getBinding(el, name, fallback) {
  if (el._x_bindings && el._x_bindings[name] !== void 0) return el._x_bindings[name];
  let attr = el.getAttribute(name);
  if (attr === null) return typeof fallback === "function" ? fallback() : fallback;

  if (isBooleanAttr(name)) {
    return !![name, "true"].includes(attr);
  }

  if (attr === "") return true;
  return attr;
} // packages/alpinejs/src/utils/debounce.js


function debounce(func, wait) {
  var timeout;
  return function () {
    var context = this,
        args = arguments;

    var later = function () {
      timeout = null;
      func.apply(context, args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
} // packages/alpinejs/src/utils/throttle.js


function throttle(func, limit) {
  let inThrottle;
  return function () {
    let context = this,
        args = arguments;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
} // packages/alpinejs/src/plugin.js


function plugin(callback) {
  callback(alpine_default);
} // packages/alpinejs/src/store.js


var stores = {};
var isReactive = false;

function store(name, value) {
  if (!isReactive) {
    stores = reactive(stores);
    isReactive = true;
  }

  if (value === void 0) {
    return stores[name];
  }

  stores[name] = value;

  if (typeof value === "object" && value !== null && value.hasOwnProperty("init") && typeof value.init === "function") {
    stores[name].init();
  }

  initInterceptors(stores[name]);
}

function getStores() {
  return stores;
} // packages/alpinejs/src/binds.js


var binds = {};

function bind2(name, object) {
  binds[name] = typeof object !== "function" ? () => object : object;
}

function injectBindingProviders(obj) {
  Object.entries(binds).forEach(_ref18 => {
    let [name, callback] = _ref18;
    Object.defineProperty(obj, name, {
      get() {
        return function () {
          return callback(...arguments);
        };
      }

    });
  });
  return obj;
} // packages/alpinejs/src/datas.js


var datas = {};

function data(name, callback) {
  datas[name] = callback;
}

function injectDataProviders(obj, context) {
  Object.entries(datas).forEach(_ref19 => {
    let [name, callback] = _ref19;
    Object.defineProperty(obj, name, {
      get() {
        return function () {
          return callback.bind(context)(...arguments);
        };
      },

      enumerable: false
    });
  });
  return obj;
} // packages/alpinejs/src/alpine.js


var Alpine = {
  get reactive() {
    return reactive;
  },

  get release() {
    return release;
  },

  get effect() {
    return effect;
  },

  get raw() {
    return raw;
  },

  version: "3.9.5",
  flushAndStopDeferringMutations,
  disableEffectScheduling,
  setReactivityEngine,
  closestDataStack,
  skipDuringClone,
  addRootSelector,
  addInitSelector,
  addScopeToNode,
  deferMutations,
  mapAttributes,
  evaluateLater,
  setEvaluator,
  mergeProxies,
  findClosest,
  closestRoot,
  interceptor,
  transition,
  setStyles,
  mutateDom,
  directive,
  throttle,
  debounce,
  evaluate,
  initTree,
  nextTick,
  prefixed: prefix,
  prefix: setPrefix,
  plugin,
  magic,
  store,
  start,
  clone,
  bound: getBinding,
  $data: scope,
  data,
  bind: bind2
};
var alpine_default = Alpine; // node_modules/@vue/shared/dist/shared.esm-bundler.js

function makeMap(str, expectsLowerCase) {
  const map = Object.create(null);
  const list = str.split(",");

  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }

  return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
}

var EMPTY_OBJ = Object.freeze({});
Object.freeze([]);
var extend = Object.assign;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var hasOwn = (val, key) => hasOwnProperty.call(val, key);

var isArray = Array.isArray;

var isMap = val => toTypeString(val) === "[object Map]";

var isString = val => typeof val === "string";

var isSymbol = val => typeof val === "symbol";

var isObject = val => val !== null && typeof val === "object";

var objectToString = Object.prototype.toString;

var toTypeString = value => objectToString.call(value);

var toRawType = value => {
  return toTypeString(value).slice(8, -1);
};

var isIntegerKey = key => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;

var cacheStringFunction = fn => {
  const cache = Object.create(null);
  return str => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
};

var capitalize = cacheStringFunction(str => str.charAt(0).toUpperCase() + str.slice(1));

var hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue); // node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js


var targetMap = new WeakMap();
var effectStack = [];
var activeEffect;
var ITERATE_KEY = Symbol("iterate");
var MAP_KEY_ITERATE_KEY = Symbol("Map key iterate");

function isEffect(fn) {
  return fn && fn._isEffect === true;
}

function effect2(fn) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : EMPTY_OBJ;

  if (isEffect(fn)) {
    fn = fn.raw;
  }

  const effect3 = createReactiveEffect(fn, options);

  if (!options.lazy) {
    effect3();
  }

  return effect3;
}

function stop(effect3) {
  if (effect3.active) {
    cleanup(effect3);

    if (effect3.options.onStop) {
      effect3.options.onStop();
    }

    effect3.active = false;
  }
}

var uid = 0;

function createReactiveEffect(fn, options) {
  const effect3 = function reactiveEffect() {
    if (!effect3.active) {
      return fn();
    }

    if (!effectStack.includes(effect3)) {
      cleanup(effect3);

      try {
        enableTracking();
        effectStack.push(effect3);
        activeEffect = effect3;
        return fn();
      } finally {
        effectStack.pop();
        resetTracking();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  };

  effect3.id = uid++;
  effect3.allowRecurse = !!options.allowRecurse;
  effect3._isEffect = true;
  effect3.active = true;
  effect3.raw = fn;
  effect3.deps = [];
  effect3.options = options;
  return effect3;
}

function cleanup(effect3) {
  const {
    deps
  } = effect3;

  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect3);
    }

    deps.length = 0;
  }
}

var shouldTrack = true;
var trackStack = [];

function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === void 0 ? true : last;
}

function track(target, type, key) {
  if (!shouldTrack || activeEffect === void 0) {
    return;
  }

  let depsMap = targetMap.get(target);

  if (!depsMap) {
    targetMap.set(target, depsMap = new Map());
  }

  let dep = depsMap.get(key);

  if (!dep) {
    depsMap.set(key, dep = new Set());
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);

    if (activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      });
    }
  }
}

function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target);

  if (!depsMap) {
    return;
  }

  const effects = new Set();

  const add2 = effectsToAdd => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect3 => {
        if (effect3 !== activeEffect || effect3.allowRecurse) {
          effects.add(effect3);
        }
      });
    }
  };

  if (type === "clear") {
    depsMap.forEach(add2);
  } else if (key === "length" && isArray(target)) {
    depsMap.forEach((dep, key2) => {
      if (key2 === "length" || key2 >= newValue) {
        add2(dep);
      }
    });
  } else {
    if (key !== void 0) {
      add2(depsMap.get(key));
    }

    switch (type) {
      case "add":
        if (!isArray(target)) {
          add2(depsMap.get(ITERATE_KEY));

          if (isMap(target)) {
            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else if (isIntegerKey(key)) {
          add2(depsMap.get("length"));
        }

        break;

      case "delete":
        if (!isArray(target)) {
          add2(depsMap.get(ITERATE_KEY));

          if (isMap(target)) {
            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }

        break;

      case "set":
        if (isMap(target)) {
          add2(depsMap.get(ITERATE_KEY));
        }

        break;
    }
  }

  const run = effect3 => {
    if (effect3.options.onTrigger) {
      effect3.options.onTrigger({
        effect: effect3,
        target,
        key,
        type,
        newValue,
        oldValue,
        oldTarget
      });
    }

    if (effect3.options.scheduler) {
      effect3.options.scheduler(effect3);
    } else {
      effect3();
    }
  };

  effects.forEach(run);
}

var isNonTrackableKeys = /* @__PURE__ */makeMap(`__proto__,__v_isRef,__isVue`);
var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map(key => Symbol[key]).filter(isSymbol));
var get2 = /* @__PURE__ */createGetter();
var shallowGet = /* @__PURE__ */createGetter(false, true);
var readonlyGet = /* @__PURE__ */createGetter(true);
var shallowReadonlyGet = /* @__PURE__ */createGetter(true, true);
var arrayInstrumentations = {};
["includes", "indexOf", "lastIndexOf"].forEach(key => {
  const method = Array.prototype[key];

  arrayInstrumentations[key] = function () {
    const arr = toRaw(this);

    for (let i = 0, l = this.length; i < l; i++) {
      track(arr, "get", i + "");
    }

    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    const res = method.apply(arr, args);

    if (res === -1 || res === false) {
      return method.apply(arr, args.map(toRaw));
    } else {
      return res;
    }
  };
});
["push", "pop", "shift", "unshift", "splice"].forEach(key => {
  const method = Array.prototype[key];

  arrayInstrumentations[key] = function () {
    pauseTracking();

    for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    const res = method.apply(this, args);
    resetTracking();
    return res;
  };
});

function createGetter() {
  let isReadonly = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  let shallow = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  return function get3(target, key, receiver) {
    if (key === "__v_isReactive") {
      return !isReadonly;
    } else if (key === "__v_isReadonly") {
      return isReadonly;
    } else if (key === "__v_raw" && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
      return target;
    }

    const targetIsArray = isArray(target);

    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }

    const res = Reflect.get(target, key, receiver);

    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    if (!isReadonly) {
      track(target, "get", key);
    }

    if (shallow) {
      return res;
    }

    if (isRef(res)) {
      const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
      return shouldUnwrap ? res.value : res;
    }

    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive2(res);
    }

    return res;
  };
}

var set2 = /* @__PURE__ */createSetter();
var shallowSet = /* @__PURE__ */createSetter(true);

function createSetter() {
  let shallow = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  return function set3(target, key, value, receiver) {
    let oldValue = target[key];

    if (!shallow) {
      value = toRaw(value);
      oldValue = toRaw(oldValue);

      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
    }

    const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);

    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, "add", key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, "set", key, value, oldValue);
      }
    }

    return result;
  };
}

function deleteProperty(target, key) {
  const hadKey = hasOwn(target, key);
  const oldValue = target[key];
  const result = Reflect.deleteProperty(target, key);

  if (result && hadKey) {
    trigger(target, "delete", key, void 0, oldValue);
  }

  return result;
}

function has(target, key) {
  const result = Reflect.has(target, key);

  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, "has", key);
  }

  return result;
}

function ownKeys$1(target) {
  track(target, "iterate", isArray(target) ? "length" : ITERATE_KEY);
  return Reflect.ownKeys(target);
}

var mutableHandlers = {
  get: get2,
  set: set2,
  deleteProperty,
  has,
  ownKeys: ownKeys$1
};
var readonlyHandlers = {
  get: readonlyGet,

  set(target, key) {
    {
      console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  },

  deleteProperty(target, key) {
    {
      console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  }

};
extend({}, mutableHandlers, {
  get: shallowGet,
  set: shallowSet
});
extend({}, readonlyHandlers, {
  get: shallowReadonlyGet
});

var toReactive = value => isObject(value) ? reactive2(value) : value;

var toReadonly = value => isObject(value) ? readonly(value) : value;

var toShallow = value => value;

var getProto = v => Reflect.getPrototypeOf(v);

function get$1(target, key) {
  let isReadonly = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  let isShallow = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  target = target["__v_raw"];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);

  if (key !== rawKey) {
    !isReadonly && track(rawTarget, "get", key);
  }

  !isReadonly && track(rawTarget, "get", rawKey);
  const {
    has: has2
  } = getProto(rawTarget);
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;

  if (has2.call(rawTarget, key)) {
    return wrap(target.get(key));
  } else if (has2.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey));
  } else if (target !== rawTarget) {
    target.get(key);
  }
}

function has$1(key) {
  let isReadonly = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  const target = this["__v_raw"];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);

  if (key !== rawKey) {
    !isReadonly && track(rawTarget, "has", key);
  }

  !isReadonly && track(rawTarget, "has", rawKey);
  return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
}

function size(target) {
  let isReadonly = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  target = target["__v_raw"];
  !isReadonly && track(toRaw(target), "iterate", ITERATE_KEY);
  return Reflect.get(target, "size", target);
}

function add(value) {
  value = toRaw(value);
  const target = toRaw(this);
  const proto = getProto(target);
  const hadKey = proto.has.call(target, value);

  if (!hadKey) {
    target.add(value);
    trigger(target, "add", value, value);
  }

  return this;
}

function set$1(key, value) {
  value = toRaw(value);
  const target = toRaw(this);
  const {
    has: has2,
    get: get3
  } = getProto(target);
  let hadKey = has2.call(target, key);

  if (!hadKey) {
    key = toRaw(key);
    hadKey = has2.call(target, key);
  } else {
    checkIdentityKeys(target, has2, key);
  }

  const oldValue = get3.call(target, key);
  target.set(key, value);

  if (!hadKey) {
    trigger(target, "add", key, value);
  } else if (hasChanged(value, oldValue)) {
    trigger(target, "set", key, value, oldValue);
  }

  return this;
}

function deleteEntry(key) {
  const target = toRaw(this);
  const {
    has: has2,
    get: get3
  } = getProto(target);
  let hadKey = has2.call(target, key);

  if (!hadKey) {
    key = toRaw(key);
    hadKey = has2.call(target, key);
  } else {
    checkIdentityKeys(target, has2, key);
  }

  const oldValue = get3 ? get3.call(target, key) : void 0;
  const result = target.delete(key);

  if (hadKey) {
    trigger(target, "delete", key, void 0, oldValue);
  }

  return result;
}

function clear() {
  const target = toRaw(this);
  const hadItems = target.size !== 0;
  const oldTarget = isMap(target) ? new Map(target) : new Set(target);
  const result = target.clear();

  if (hadItems) {
    trigger(target, "clear", void 0, void 0, oldTarget);
  }

  return result;
}

function createForEach(isReadonly, isShallow) {
  return function forEach(callback, thisArg) {
    const observed = this;
    const target = observed["__v_raw"];
    const rawTarget = toRaw(target);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    !isReadonly && track(rawTarget, "iterate", ITERATE_KEY);
    return target.forEach((value, key) => {
      return callback.call(thisArg, wrap(value), wrap(key), observed);
    });
  };
}

function createIterableMethod(method, isReadonly, isShallow) {
  return function () {
    const target = this["__v_raw"];
    const rawTarget = toRaw(target);
    const targetIsMap = isMap(rawTarget);
    const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
    const isKeyOnly = method === "keys" && targetIsMap;
    const innerIterator = target[method](...arguments);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    !isReadonly && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
    return {
      next() {
        const {
          value,
          done
        } = innerIterator.next();
        return done ? {
          value,
          done
        } : {
          value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
          done
        };
      },

      [Symbol.iterator]() {
        return this;
      }

    };
  };
}

function createReadonlyMethod(type) {
  return function () {
    {
      const key = (arguments.length <= 0 ? undefined : arguments[0]) ? `on key "${arguments.length <= 0 ? undefined : arguments[0]}" ` : ``;
      console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
    }
    return type === "delete" ? false : this;
  };
}

var mutableInstrumentations = {
  get(key) {
    return get$1(this, key);
  },

  get size() {
    return size(this);
  },

  has: has$1,
  add,
  set: set$1,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
};
var shallowInstrumentations = {
  get(key) {
    return get$1(this, key, false, true);
  },

  get size() {
    return size(this);
  },

  has: has$1,
  add,
  set: set$1,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, true)
};
var readonlyInstrumentations = {
  get(key) {
    return get$1(this, key, true);
  },

  get size() {
    return size(this, true);
  },

  has(key) {
    return has$1.call(this, key, true);
  },

  add: createReadonlyMethod("add"),
  set: createReadonlyMethod("set"),
  delete: createReadonlyMethod("delete"),
  clear: createReadonlyMethod("clear"),
  forEach: createForEach(true, false)
};
var shallowReadonlyInstrumentations = {
  get(key) {
    return get$1(this, key, true, true);
  },

  get size() {
    return size(this, true);
  },

  has(key) {
    return has$1.call(this, key, true);
  },

  add: createReadonlyMethod("add"),
  set: createReadonlyMethod("set"),
  delete: createReadonlyMethod("delete"),
  clear: createReadonlyMethod("clear"),
  forEach: createForEach(true, true)
};
var iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
iteratorMethods.forEach(method => {
  mutableInstrumentations[method] = createIterableMethod(method, false, false);
  readonlyInstrumentations[method] = createIterableMethod(method, true, false);
  shallowInstrumentations[method] = createIterableMethod(method, false, true);
  shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
});

function createInstrumentationGetter(isReadonly, shallow) {
  const instrumentations = shallow ? isReadonly ? shallowReadonlyInstrumentations : shallowInstrumentations : isReadonly ? readonlyInstrumentations : mutableInstrumentations;
  return (target, key, receiver) => {
    if (key === "__v_isReactive") {
      return !isReadonly;
    } else if (key === "__v_isReadonly") {
      return isReadonly;
    } else if (key === "__v_raw") {
      return target;
    }

    return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
  };
}

var mutableCollectionHandlers = {
  get: createInstrumentationGetter(false, false)
};
var readonlyCollectionHandlers = {
  get: createInstrumentationGetter(true, false)
};

function checkIdentityKeys(target, has2, key) {
  const rawKey = toRaw(key);

  if (rawKey !== key && has2.call(target, rawKey)) {
    const type = toRawType(target);
    console.warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
  }
}

var reactiveMap = new WeakMap();
var shallowReactiveMap = new WeakMap();
var readonlyMap = new WeakMap();
var shallowReadonlyMap = new WeakMap();

function targetTypeMap(rawType) {
  switch (rawType) {
    case "Object":
    case "Array":
      return 1;

    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;

    default:
      return 0;
  }
}

function getTargetType(value) {
  return value["__v_skip"] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
}

function reactive2(target) {
  if (target && target["__v_isReadonly"]) {
    return target;
  }

  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}

function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
}

function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
  if (!isObject(target)) {
    {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }

  if (target["__v_raw"] && !(isReadonly && target["__v_isReactive"])) {
    return target;
  }

  const existingProxy = proxyMap.get(target);

  if (existingProxy) {
    return existingProxy;
  }

  const targetType = getTargetType(target);

  if (targetType === 0) {
    return target;
  }

  const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}

function toRaw(observed) {
  return observed && toRaw(observed["__v_raw"]) || observed;
}

function isRef(r) {
  return Boolean(r && r.__v_isRef === true);
} // packages/alpinejs/src/magics/$nextTick.js


magic("nextTick", () => nextTick); // packages/alpinejs/src/magics/$dispatch.js

magic("dispatch", el => dispatch.bind(dispatch, el)); // packages/alpinejs/src/magics/$watch.js

magic("watch", (el, _ref20) => {
  let {
    evaluateLater: evaluateLater2,
    effect: effect3
  } = _ref20;
  return (key, callback) => {
    let evaluate2 = evaluateLater2(key);
    let firstTime = true;
    let oldValue;
    let effectReference = effect3(() => evaluate2(value => {
      JSON.stringify(value);

      if (!firstTime) {
        queueMicrotask(() => {
          callback(value, oldValue);
          oldValue = value;
        });
      } else {
        oldValue = value;
      }

      firstTime = false;
    }));

    el._x_effects.delete(effectReference);
  };
}); // packages/alpinejs/src/magics/$store.js

magic("store", getStores); // packages/alpinejs/src/magics/$data.js

magic("data", el => scope(el)); // packages/alpinejs/src/magics/$root.js

magic("root", el => closestRoot(el)); // packages/alpinejs/src/magics/$refs.js

magic("refs", el => {
  if (el._x_refs_proxy) return el._x_refs_proxy;
  el._x_refs_proxy = mergeProxies(getArrayOfRefObject(el));
  return el._x_refs_proxy;
});

function getArrayOfRefObject(el) {
  let refObjects = [];
  let currentEl = el;

  while (currentEl) {
    if (currentEl._x_refs) refObjects.push(currentEl._x_refs);
    currentEl = currentEl.parentNode;
  }

  return refObjects;
} // packages/alpinejs/src/ids.js


var globalIdMemo = {};

function findAndIncrementId(name) {
  if (!globalIdMemo[name]) globalIdMemo[name] = 0;
  return ++globalIdMemo[name];
}

function closestIdRoot(el, name) {
  return findClosest(el, element => {
    if (element._x_ids && element._x_ids[name]) return true;
  });
}

function setIdRoot(el, name) {
  if (!el._x_ids) el._x_ids = {};
  if (!el._x_ids[name]) el._x_ids[name] = findAndIncrementId(name);
} // packages/alpinejs/src/magics/$id.js


magic("id", el => function (name) {
  let key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let root = closestIdRoot(el, name);
  let id = root ? root._x_ids[name] : findAndIncrementId(name);
  return key ? `${name}-${id}-${key}` : `${name}-${id}`;
}); // packages/alpinejs/src/magics/$el.js

magic("el", el => el); // packages/alpinejs/src/directives/x-modelable.js

directive("modelable", (el, _ref21, _ref22) => {
  let {
    expression
  } = _ref21;
  let {
    effect: effect3,
    evaluateLater: evaluateLater2
  } = _ref22;
  let func = evaluateLater2(expression);

  let innerGet = () => {
    let result;
    func(i => result = i);
    return result;
  };

  let evaluateInnerSet = evaluateLater2(`${expression} = __placeholder`);

  let innerSet = val => evaluateInnerSet(() => {}, {
    scope: {
      __placeholder: val
    }
  });

  let initialValue = innerGet();
  innerSet(initialValue);
  queueMicrotask(() => {
    if (!el._x_model) return;

    el._x_removeModelListeners["default"]();

    let outerGet = el._x_model.get;
    let outerSet = el._x_model.set;
    effect3(() => innerSet(outerGet()));
    effect3(() => outerSet(innerGet()));
  });
}); // packages/alpinejs/src/directives/x-teleport.js

directive("teleport", (el, _ref23, _ref24) => {
  let {
    expression
  } = _ref23;
  let {
    cleanup: cleanup2
  } = _ref24;
  if (el.tagName.toLowerCase() !== "template") warn("x-teleport can only be used on a <template> tag", el);
  let target = document.querySelector(expression);
  if (!target) warn(`Cannot find x-teleport element for selector: "${expression}"`);
  let clone2 = el.content.cloneNode(true).firstElementChild;
  el._x_teleport = clone2;
  clone2._x_teleportBack = el;

  if (el._x_forwardEvents) {
    el._x_forwardEvents.forEach(eventName => {
      clone2.addEventListener(eventName, e => {
        e.stopPropagation();
        el.dispatchEvent(new e.constructor(e.type, e));
      });
    });
  }

  addScopeToNode(clone2, {}, el);
  mutateDom(() => {
    target.appendChild(clone2);
    initTree(clone2);
    clone2._x_ignore = true;
  });
  cleanup2(() => clone2.remove());
}); // packages/alpinejs/src/directives/x-ignore.js

var handler = () => {};

handler.inline = (el, _ref25, _ref26) => {
  let {
    modifiers
  } = _ref25;
  let {
    cleanup: cleanup2
  } = _ref26;
  modifiers.includes("self") ? el._x_ignoreSelf = true : el._x_ignore = true;
  cleanup2(() => {
    modifiers.includes("self") ? delete el._x_ignoreSelf : delete el._x_ignore;
  });
};

directive("ignore", handler); // packages/alpinejs/src/directives/x-effect.js

directive("effect", (el, _ref27, _ref28) => {
  let {
    expression
  } = _ref27;
  let {
    effect: effect3
  } = _ref28;
  return effect3(evaluateLater(el, expression));
}); // packages/alpinejs/src/utils/on.js

function on(el, event, modifiers, callback) {
  let listenerTarget = el;

  let handler3 = e => callback(e);

  let options = {};

  let wrapHandler = (callback2, wrapper) => e => wrapper(callback2, e);

  if (modifiers.includes("dot")) event = dotSyntax(event);
  if (modifiers.includes("camel")) event = camelCase2(event);
  if (modifiers.includes("passive")) options.passive = true;
  if (modifiers.includes("capture")) options.capture = true;
  if (modifiers.includes("window")) listenerTarget = window;
  if (modifiers.includes("document")) listenerTarget = document;
  if (modifiers.includes("prevent")) handler3 = wrapHandler(handler3, (next, e) => {
    e.preventDefault();
    next(e);
  });
  if (modifiers.includes("stop")) handler3 = wrapHandler(handler3, (next, e) => {
    e.stopPropagation();
    next(e);
  });
  if (modifiers.includes("self")) handler3 = wrapHandler(handler3, (next, e) => {
    e.target === el && next(e);
  });

  if (modifiers.includes("away") || modifiers.includes("outside")) {
    listenerTarget = document;
    handler3 = wrapHandler(handler3, (next, e) => {
      if (el.contains(e.target)) return;
      if (e.target.isConnected === false) return;
      if (el.offsetWidth < 1 && el.offsetHeight < 1) return;
      if (el._x_isShown === false) return;
      next(e);
    });
  }

  if (modifiers.includes("once")) {
    handler3 = wrapHandler(handler3, (next, e) => {
      next(e);
      listenerTarget.removeEventListener(event, handler3, options);
    });
  }

  handler3 = wrapHandler(handler3, (next, e) => {
    if (isKeyEvent(event)) {
      if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
        return;
      }
    }

    next(e);
  });

  if (modifiers.includes("debounce")) {
    let nextModifier = modifiers[modifiers.indexOf("debounce") + 1] || "invalid-wait";
    let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
    handler3 = debounce(handler3, wait);
  }

  if (modifiers.includes("throttle")) {
    let nextModifier = modifiers[modifiers.indexOf("throttle") + 1] || "invalid-wait";
    let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
    handler3 = throttle(handler3, wait);
  }

  listenerTarget.addEventListener(event, handler3, options);
  return () => {
    listenerTarget.removeEventListener(event, handler3, options);
  };
}

function dotSyntax(subject) {
  return subject.replace(/-/g, ".");
}

function camelCase2(subject) {
  return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
}

function isNumeric(subject) {
  return !Array.isArray(subject) && !isNaN(subject);
}

function kebabCase2(subject) {
  return subject.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase();
}

function isKeyEvent(event) {
  return ["keydown", "keyup"].includes(event);
}

function isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers) {
  let keyModifiers = modifiers.filter(i => {
    return !["window", "document", "prevent", "stop", "once"].includes(i);
  });

  if (keyModifiers.includes("debounce")) {
    let debounceIndex = keyModifiers.indexOf("debounce");
    keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
  }

  if (keyModifiers.length === 0) return false;
  if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0])) return false;
  const systemKeyModifiers = ["ctrl", "shift", "alt", "meta", "cmd", "super"];
  const selectedSystemKeyModifiers = systemKeyModifiers.filter(modifier => keyModifiers.includes(modifier));
  keyModifiers = keyModifiers.filter(i => !selectedSystemKeyModifiers.includes(i));

  if (selectedSystemKeyModifiers.length > 0) {
    const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter(modifier => {
      if (modifier === "cmd" || modifier === "super") modifier = "meta";
      return e[`${modifier}Key`];
    });

    if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {
      if (keyToModifiers(e.key).includes(keyModifiers[0])) return false;
    }
  }

  return true;
}

function keyToModifiers(key) {
  if (!key) return [];
  key = kebabCase2(key);
  let modifierToKeyMap = {
    ctrl: "control",
    slash: "/",
    space: "-",
    spacebar: "-",
    cmd: "meta",
    esc: "escape",
    up: "arrow-up",
    down: "arrow-down",
    left: "arrow-left",
    right: "arrow-right",
    period: ".",
    equal: "="
  };
  modifierToKeyMap[key] = key;
  return Object.keys(modifierToKeyMap).map(modifier => {
    if (modifierToKeyMap[modifier] === key) return modifier;
  }).filter(modifier => modifier);
} // packages/alpinejs/src/directives/x-model.js


directive("model", (el, _ref29, _ref30) => {
  let {
    modifiers,
    expression
  } = _ref29;
  let {
    effect: effect3,
    cleanup: cleanup2
  } = _ref30;
  let evaluate2 = evaluateLater(el, expression);
  let assignmentExpression = `${expression} = rightSideOfExpression($event, ${expression})`;
  let evaluateAssignment = evaluateLater(el, assignmentExpression);
  var event = el.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(el.type) || modifiers.includes("lazy") ? "change" : "input";
  let assigmentFunction = generateAssignmentFunction(el, modifiers, expression);
  let removeListener = on(el, event, modifiers, e => {
    evaluateAssignment(() => {}, {
      scope: {
        $event: e,
        rightSideOfExpression: assigmentFunction
      }
    });
  });
  if (!el._x_removeModelListeners) el._x_removeModelListeners = {};
  el._x_removeModelListeners["default"] = removeListener;
  cleanup2(() => el._x_removeModelListeners["default"]());
  let evaluateSetModel = evaluateLater(el, `${expression} = __placeholder`);
  el._x_model = {
    get() {
      let result;
      evaluate2(value => result = value);
      return result;
    },

    set(value) {
      evaluateSetModel(() => {}, {
        scope: {
          __placeholder: value
        }
      });
    }

  };

  el._x_forceModelUpdate = () => {
    evaluate2(value => {
      if (value === void 0 && expression.match(/\./)) value = "";
      window.fromModel = true;
      mutateDom(() => bind(el, "value", value));
      delete window.fromModel;
    });
  };

  effect3(() => {
    if (modifiers.includes("unintrusive") && document.activeElement.isSameNode(el)) return;

    el._x_forceModelUpdate();
  });
});

function generateAssignmentFunction(el, modifiers, expression) {
  if (el.type === "radio") {
    mutateDom(() => {
      if (!el.hasAttribute("name")) el.setAttribute("name", expression);
    });
  }

  return (event, currentValue) => {
    return mutateDom(() => {
      if (event instanceof CustomEvent && event.detail !== void 0) {
        return event.detail || event.target.value;
      } else if (el.type === "checkbox") {
        if (Array.isArray(currentValue)) {
          let newValue = modifiers.includes("number") ? safeParseNumber(event.target.value) : event.target.value;
          return event.target.checked ? currentValue.concat([newValue]) : currentValue.filter(el2 => !checkedAttrLooseCompare2(el2, newValue));
        } else {
          return event.target.checked;
        }
      } else if (el.tagName.toLowerCase() === "select" && el.multiple) {
        return modifiers.includes("number") ? Array.from(event.target.selectedOptions).map(option => {
          let rawValue = option.value || option.text;
          return safeParseNumber(rawValue);
        }) : Array.from(event.target.selectedOptions).map(option => {
          return option.value || option.text;
        });
      } else {
        let rawValue = event.target.value;
        return modifiers.includes("number") ? safeParseNumber(rawValue) : modifiers.includes("trim") ? rawValue.trim() : rawValue;
      }
    });
  };
}

function safeParseNumber(rawValue) {
  let number = rawValue ? parseFloat(rawValue) : null;
  return isNumeric2(number) ? number : rawValue;
}

function checkedAttrLooseCompare2(valueA, valueB) {
  return valueA == valueB;
}

function isNumeric2(subject) {
  return !Array.isArray(subject) && !isNaN(subject);
} // packages/alpinejs/src/directives/x-cloak.js


directive("cloak", el => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix("cloak"))))); // packages/alpinejs/src/directives/x-init.js

addInitSelector(() => `[${prefix("init")}]`);
directive("init", skipDuringClone((el, _ref31, _ref32) => {
  let {
    expression
  } = _ref31;
  let {
    evaluate: evaluate2
  } = _ref32;

  if (typeof expression === "string") {
    return !!expression.trim() && evaluate2(expression, {}, false);
  }

  return evaluate2(expression, {}, false);
})); // packages/alpinejs/src/directives/x-text.js

directive("text", (el, _ref33, _ref34) => {
  let {
    expression
  } = _ref33;
  let {
    effect: effect3,
    evaluateLater: evaluateLater2
  } = _ref34;
  let evaluate2 = evaluateLater2(expression);
  effect3(() => {
    evaluate2(value => {
      mutateDom(() => {
        el.textContent = value;
      });
    });
  });
}); // packages/alpinejs/src/directives/x-html.js

directive("html", (el, _ref35, _ref36) => {
  let {
    expression
  } = _ref35;
  let {
    effect: effect3,
    evaluateLater: evaluateLater2
  } = _ref36;
  let evaluate2 = evaluateLater2(expression);
  effect3(() => {
    evaluate2(value => {
      mutateDom(() => {
        el.innerHTML = value;
        el._x_ignoreSelf = true;
        initTree(el);
        delete el._x_ignoreSelf;
      });
    });
  });
}); // packages/alpinejs/src/directives/x-bind.js

mapAttributes(startingWith(":", into(prefix("bind:"))));
directive("bind", (el, _ref37, _ref38) => {
  let {
    value,
    modifiers,
    expression,
    original
  } = _ref37;
  let {
    effect: effect3
  } = _ref38;

  if (!value) {
    return applyBindingsObject(el, expression, original);
  }

  if (value === "key") return storeKeyForXFor(el, expression);
  let evaluate2 = evaluateLater(el, expression);
  effect3(() => evaluate2(result => {
    if (result === void 0 && expression.match(/\./)) result = "";
    mutateDom(() => bind(el, value, result, modifiers));
  }));
});

function applyBindingsObject(el, expression, original, effect3) {
  let bindingProviders = {};
  injectBindingProviders(bindingProviders);
  let getBindings = evaluateLater(el, expression);
  let cleanupRunners = [];

  while (cleanupRunners.length) cleanupRunners.pop()();

  getBindings(bindings => {
    let attributes = Object.entries(bindings).map(_ref39 => {
      let [name, value] = _ref39;
      return {
        name,
        value
      };
    });
    let staticAttributes = attributesOnly(attributes);
    attributes = attributes.map(attribute => {
      if (staticAttributes.find(attr => attr.name === attribute.name)) {
        return {
          name: `x-bind:${attribute.name}`,
          value: `"${attribute.value}"`
        };
      }

      return attribute;
    });
    directives(el, attributes, original).map(handle => {
      cleanupRunners.push(handle.runCleanups);
      handle();
    });
  }, {
    scope: bindingProviders
  });
}

function storeKeyForXFor(el, expression) {
  el._x_keyExpression = expression;
} // packages/alpinejs/src/directives/x-data.js


addRootSelector(() => `[${prefix("data")}]`);
directive("data", skipDuringClone((el, _ref40, _ref41) => {
  let {
    expression
  } = _ref40;
  let {
    cleanup: cleanup2
  } = _ref41;
  expression = expression === "" ? "{}" : expression;
  let magicContext = {};
  injectMagics(magicContext, el);
  let dataProviderContext = {};
  injectDataProviders(dataProviderContext, magicContext);
  let data2 = evaluate(el, expression, {
    scope: dataProviderContext
  });
  if (data2 === void 0) data2 = {};
  injectMagics(data2, el);
  let reactiveData = reactive(data2);
  initInterceptors(reactiveData);
  let undo = addScopeToNode(el, reactiveData);
  reactiveData["init"] && evaluate(el, reactiveData["init"]);
  cleanup2(() => {
    reactiveData["destroy"] && evaluate(el, reactiveData["destroy"]);
    undo();
  });
})); // packages/alpinejs/src/directives/x-show.js

directive("show", (el, _ref42, _ref43) => {
  let {
    modifiers,
    expression
  } = _ref42;
  let {
    effect: effect3
  } = _ref43;
  let evaluate2 = evaluateLater(el, expression);

  let hide = () => mutateDom(() => {
    el.style.display = "none";
    el._x_isShown = false;
  });

  let show = () => mutateDom(() => {
    if (el.style.length === 1 && el.style.display === "none") {
      el.removeAttribute("style");
    } else {
      el.style.removeProperty("display");
    }

    el._x_isShown = true;
  });

  let clickAwayCompatibleShow = () => setTimeout(show);

  let toggle = once(value => value ? show() : hide(), value => {
    if (typeof el._x_toggleAndCascadeWithTransitions === "function") {
      el._x_toggleAndCascadeWithTransitions(el, value, show, hide);
    } else {
      value ? clickAwayCompatibleShow() : hide();
    }
  });
  let oldValue;
  let firstTime = true;
  effect3(() => evaluate2(value => {
    if (!firstTime && value === oldValue) return;
    if (modifiers.includes("immediate")) value ? clickAwayCompatibleShow() : hide();
    toggle(value);
    oldValue = value;
    firstTime = false;
  }));
}); // packages/alpinejs/src/directives/x-for.js

directive("for", (el, _ref44, _ref45) => {
  let {
    expression
  } = _ref44;
  let {
    effect: effect3,
    cleanup: cleanup2
  } = _ref45;
  let iteratorNames = parseForExpression(expression);
  let evaluateItems = evaluateLater(el, iteratorNames.items);
  let evaluateKey = evaluateLater(el, el._x_keyExpression || "index");
  el._x_prevKeys = [];
  el._x_lookup = {};
  effect3(() => loop(el, iteratorNames, evaluateItems, evaluateKey));
  cleanup2(() => {
    Object.values(el._x_lookup).forEach(el2 => el2.remove());
    delete el._x_prevKeys;
    delete el._x_lookup;
  });
});

function loop(el, iteratorNames, evaluateItems, evaluateKey) {
  let isObject2 = i => typeof i === "object" && !Array.isArray(i);

  let templateEl = el;
  evaluateItems(items => {
    if (isNumeric3(items) && items >= 0) {
      items = Array.from(Array(items).keys(), i => i + 1);
    }

    if (items === void 0) items = [];
    let lookup = el._x_lookup;
    let prevKeys = el._x_prevKeys;
    let scopes = [];
    let keys = [];

    if (isObject2(items)) {
      items = Object.entries(items).map(_ref46 => {
        let [key, value] = _ref46;
        let scope2 = getIterationScopeVariables(iteratorNames, value, key, items);
        evaluateKey(value2 => keys.push(value2), {
          scope: {
            index: key,
            ...scope2
          }
        });
        scopes.push(scope2);
      });
    } else {
      for (let i = 0; i < items.length; i++) {
        let scope2 = getIterationScopeVariables(iteratorNames, items[i], i, items);
        evaluateKey(value => keys.push(value), {
          scope: {
            index: i,
            ...scope2
          }
        });
        scopes.push(scope2);
      }
    }

    let adds = [];
    let moves = [];
    let removes = [];
    let sames = [];

    for (let i = 0; i < prevKeys.length; i++) {
      let key = prevKeys[i];
      if (keys.indexOf(key) === -1) removes.push(key);
    }

    prevKeys = prevKeys.filter(key => !removes.includes(key));
    let lastKey = "template";

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let prevIndex = prevKeys.indexOf(key);

      if (prevIndex === -1) {
        prevKeys.splice(i, 0, key);
        adds.push([lastKey, i]);
      } else if (prevIndex !== i) {
        let keyInSpot = prevKeys.splice(i, 1)[0];
        let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0];
        prevKeys.splice(i, 0, keyForSpot);
        prevKeys.splice(prevIndex, 0, keyInSpot);
        moves.push([keyInSpot, keyForSpot]);
      } else {
        sames.push(key);
      }

      lastKey = key;
    }

    for (let i = 0; i < removes.length; i++) {
      let key = removes[i];

      if (!!lookup[key]._x_effects) {
        lookup[key]._x_effects.forEach(dequeueJob);
      }

      lookup[key].remove();
      lookup[key] = null;
      delete lookup[key];
    }

    for (let i = 0; i < moves.length; i++) {
      let [keyInSpot, keyForSpot] = moves[i];
      let elInSpot = lookup[keyInSpot];
      let elForSpot = lookup[keyForSpot];
      let marker = document.createElement("div");
      mutateDom(() => {
        elForSpot.after(marker);
        elInSpot.after(elForSpot);
        elForSpot._x_currentIfEl && elForSpot.after(elForSpot._x_currentIfEl);
        marker.before(elInSpot);
        elInSpot._x_currentIfEl && elInSpot.after(elInSpot._x_currentIfEl);
        marker.remove();
      });
      refreshScope(elForSpot, scopes[keys.indexOf(keyForSpot)]);
    }

    for (let i = 0; i < adds.length; i++) {
      let [lastKey2, index] = adds[i];
      let lastEl = lastKey2 === "template" ? templateEl : lookup[lastKey2];
      if (lastEl._x_currentIfEl) lastEl = lastEl._x_currentIfEl;
      let scope2 = scopes[index];
      let key = keys[index];
      let clone2 = document.importNode(templateEl.content, true).firstElementChild;
      addScopeToNode(clone2, reactive(scope2), templateEl);
      mutateDom(() => {
        lastEl.after(clone2);
        initTree(clone2);
      });

      if (typeof key === "object") {
        warn("x-for key cannot be an object, it must be a string or an integer", templateEl);
      }

      lookup[key] = clone2;
    }

    for (let i = 0; i < sames.length; i++) {
      refreshScope(lookup[sames[i]], scopes[keys.indexOf(sames[i])]);
    }

    templateEl._x_prevKeys = keys;
  });
}

function parseForExpression(expression) {
  let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
  let stripParensRE = /^\s*\(|\)\s*$/g;
  let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
  let inMatch = expression.match(forAliasRE);
  if (!inMatch) return;
  let res = {};
  res.items = inMatch[2].trim();
  let item = inMatch[1].replace(stripParensRE, "").trim();
  let iteratorMatch = item.match(forIteratorRE);

  if (iteratorMatch) {
    res.item = item.replace(forIteratorRE, "").trim();
    res.index = iteratorMatch[1].trim();

    if (iteratorMatch[2]) {
      res.collection = iteratorMatch[2].trim();
    }
  } else {
    res.item = item;
  }

  return res;
}

function getIterationScopeVariables(iteratorNames, item, index, items) {
  let scopeVariables = {};

  if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
    let names = iteratorNames.item.replace("[", "").replace("]", "").split(",").map(i => i.trim());
    names.forEach((name, i) => {
      scopeVariables[name] = item[i];
    });
  } else if (/^\{.*\}$/.test(iteratorNames.item) && !Array.isArray(item) && typeof item === "object") {
    let names = iteratorNames.item.replace("{", "").replace("}", "").split(",").map(i => i.trim());
    names.forEach(name => {
      scopeVariables[name] = item[name];
    });
  } else {
    scopeVariables[iteratorNames.item] = item;
  }

  if (iteratorNames.index) scopeVariables[iteratorNames.index] = index;
  if (iteratorNames.collection) scopeVariables[iteratorNames.collection] = items;
  return scopeVariables;
}

function isNumeric3(subject) {
  return !Array.isArray(subject) && !isNaN(subject);
} // packages/alpinejs/src/directives/x-ref.js


function handler2() {}

handler2.inline = (el, _ref47, _ref48) => {
  let {
    expression
  } = _ref47;
  let {
    cleanup: cleanup2
  } = _ref48;
  let root = closestRoot(el);
  if (!root._x_refs) root._x_refs = {};
  root._x_refs[expression] = el;
  cleanup2(() => delete root._x_refs[expression]);
};

directive("ref", handler2); // packages/alpinejs/src/directives/x-if.js

directive("if", (el, _ref49, _ref50) => {
  let {
    expression
  } = _ref49;
  let {
    effect: effect3,
    cleanup: cleanup2
  } = _ref50;
  let evaluate2 = evaluateLater(el, expression);

  let show = () => {
    if (el._x_currentIfEl) return el._x_currentIfEl;
    let clone2 = el.content.cloneNode(true).firstElementChild;
    addScopeToNode(clone2, {}, el);
    mutateDom(() => {
      el.after(clone2);
      initTree(clone2);
    });
    el._x_currentIfEl = clone2;

    el._x_undoIf = () => {
      walk(clone2, node => {
        if (!!node._x_effects) {
          node._x_effects.forEach(dequeueJob);
        }
      });
      clone2.remove();
      delete el._x_currentIfEl;
    };

    return clone2;
  };

  let hide = () => {
    if (!el._x_undoIf) return;

    el._x_undoIf();

    delete el._x_undoIf;
  };

  effect3(() => evaluate2(value => {
    value ? show() : hide();
  }));
  cleanup2(() => el._x_undoIf && el._x_undoIf());
}); // packages/alpinejs/src/directives/x-id.js

directive("id", (el, _ref51, _ref52) => {
  let {
    expression
  } = _ref51;
  let {
    evaluate: evaluate2
  } = _ref52;
  let names = evaluate2(expression);
  names.forEach(name => setIdRoot(el, name));
}); // packages/alpinejs/src/directives/x-on.js

mapAttributes(startingWith("@", into(prefix("on:"))));
directive("on", skipDuringClone((el, _ref53, _ref54) => {
  let {
    value,
    modifiers,
    expression
  } = _ref53;
  let {
    cleanup: cleanup2
  } = _ref54;
  let evaluate2 = expression ? evaluateLater(el, expression) : () => {};

  if (el.tagName.toLowerCase() === "template") {
    if (!el._x_forwardEvents) el._x_forwardEvents = [];
    if (!el._x_forwardEvents.includes(value)) el._x_forwardEvents.push(value);
  }

  let removeListener = on(el, value, modifiers, e => {
    evaluate2(() => {}, {
      scope: {
        $event: e
      },
      params: [e]
    });
  });
  cleanup2(() => removeListener());
})); // packages/alpinejs/src/index.js

alpine_default.setEvaluator(normalEvaluator);
alpine_default.setReactivityEngine({
  reactive: reactive2,
  effect: effect2,
  release: stop,
  raw: toRaw
});
var src_default$4 = alpine_default; // packages/alpinejs/builds/module.js

var module_default$4 = src_default$4; // packages/intersect/src/index.js

function src_default$3(Alpine) {
  Alpine.directive("intersect", (el, _ref55, _ref56) => {
    let {
      value,
      expression,
      modifiers
    } = _ref55;
    let {
      evaluateLater,
      cleanup
    } = _ref56;
    let evaluate = evaluateLater(expression);
    let options = {
      rootMargin: getRootMargin(modifiers),
      threshold: getThreshhold(modifiers)
    };
    let observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting === (value === "leave")) return;
        evaluate();
        modifiers.includes("once") && observer.disconnect();
      });
    }, options);
    observer.observe(el);
    cleanup(() => {
      observer.disconnect();
    });
  });
}

function getThreshhold(modifiers) {
  if (modifiers.includes("full")) return 0.99;
  if (modifiers.includes("half")) return 0.5;
  if (!modifiers.includes("threshold")) return 0;
  let threshold = modifiers[modifiers.indexOf("threshold") + 1];
  if (threshold === "100") return 1;
  if (threshold === "0") return 0;
  return Number(`.${threshold}`);
}

function getLengthValue(rawValue) {
  let match = rawValue.match(/^(-?[0-9]+)(px|%)?$/);
  return match ? match[1] + (match[2] || "px") : void 0;
}

function getRootMargin(modifiers) {
  const key = "margin";
  const fallback = "0px 0px 0px 0px";
  const index = modifiers.indexOf(key);
  if (index === -1) return fallback;
  let values = [];

  for (let i = 1; i < 5; i++) {
    values.push(getLengthValue(modifiers[index + i] || ""));
  }

  values = values.filter(v => v !== void 0);
  return values.length ? values.join(" ").trim() : fallback;
} // packages/intersect/builds/module.js


var module_default$3 = src_default$3; // node_modules/tabbable/dist/index.esm.js

/*!
* tabbable 5.2.1
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/

var candidateSelectors = ["input", "select", "textarea", "a[href]", "button", "[tabindex]", "audio[controls]", "video[controls]", '[contenteditable]:not([contenteditable="false"])', "details>summary:first-of-type", "details"];
var candidateSelector = /* @__PURE__ */candidateSelectors.join(",");
var matches = typeof Element === "undefined" ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

var getCandidates = function getCandidates2(el, includeContainer, filter) {
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector));

  if (includeContainer && matches.call(el, candidateSelector)) {
    candidates.unshift(el);
  }

  candidates = candidates.filter(filter);
  return candidates;
};

var isContentEditable = function isContentEditable2(node) {
  return node.contentEditable === "true";
};

var getTabindex = function getTabindex2(node) {
  var tabindexAttr = parseInt(node.getAttribute("tabindex"), 10);

  if (!isNaN(tabindexAttr)) {
    return tabindexAttr;
  }

  if (isContentEditable(node)) {
    return 0;
  }

  if ((node.nodeName === "AUDIO" || node.nodeName === "VIDEO" || node.nodeName === "DETAILS") && node.getAttribute("tabindex") === null) {
    return 0;
  }

  return node.tabIndex;
};

var sortOrderedTabbables = function sortOrderedTabbables2(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};

var isInput = function isInput2(node) {
  return node.tagName === "INPUT";
};

var isHiddenInput = function isHiddenInput2(node) {
  return isInput(node) && node.type === "hidden";
};

var isDetailsWithSummary = function isDetailsWithSummary2(node) {
  var r = node.tagName === "DETAILS" && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === "SUMMARY";
  });
  return r;
};

var getCheckedRadio = function getCheckedRadio2(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};

var isTabbableRadio = function isTabbableRadio2(node) {
  if (!node.name) {
    return true;
  }

  var radioScope = node.form || node.ownerDocument;

  var queryRadios = function queryRadios2(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };

  var radioSet;

  if (typeof window !== "undefined" && typeof window.CSS !== "undefined" && typeof window.CSS.escape === "function") {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      console.error("Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s", err.message);
      return false;
    }
  }

  var checked = getCheckedRadio(radioSet, node.form);
  return !checked || checked === node;
};

var isRadio = function isRadio2(node) {
  return isInput(node) && node.type === "radio";
};

var isNonTabbableRadio = function isNonTabbableRadio2(node) {
  return isRadio(node) && !isTabbableRadio(node);
};

var isHidden = function isHidden2(node, displayCheck) {
  if (getComputedStyle(node).visibility === "hidden") {
    return true;
  }

  var isDirectSummary = matches.call(node, "details>summary:first-of-type");
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;

  if (matches.call(nodeUnderDetails, "details:not([open]) *")) {
    return true;
  }

  if (!displayCheck || displayCheck === "full") {
    while (node) {
      if (getComputedStyle(node).display === "none") {
        return true;
      }

      node = node.parentElement;
    }
  } else if (displayCheck === "non-zero-area") {
    var _node$getBoundingClie = node.getBoundingClientRect(),
        width = _node$getBoundingClie.width,
        height = _node$getBoundingClie.height;

    return width === 0 && height === 0;
  }

  return false;
};

var isDisabledFromFieldset = function isDisabledFromFieldset2(node) {
  if (isInput(node) || node.tagName === "SELECT" || node.tagName === "TEXTAREA" || node.tagName === "BUTTON") {
    var parentNode = node.parentElement;

    while (parentNode) {
      if (parentNode.tagName === "FIELDSET" && parentNode.disabled) {
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i);

          if (child.tagName === "LEGEND") {
            if (child.contains(node)) {
              return false;
            }

            return true;
          }
        }

        return true;
      }

      parentNode = parentNode.parentElement;
    }
  }

  return false;
};

var isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable2(options, node) {
  if (node.disabled || isHiddenInput(node) || isHidden(node, options.displayCheck) || isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }

  return true;
};

var isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable2(options, node) {
  if (!isNodeMatchingSelectorFocusable(options, node) || isNonTabbableRadio(node) || getTabindex(node) < 0) {
    return false;
  }

  return true;
};

var tabbable = function tabbable2(el, options) {
  options = options || {};
  var regularTabbables = [];
  var orderedTabbables = [];
  var candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorTabbable.bind(null, options));
  candidates.forEach(function (candidate, i) {
    var candidateTabindex = getTabindex(candidate);

    if (candidateTabindex === 0) {
      regularTabbables.push(candidate);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        node: candidate
      });
    }
  });
  var tabbableNodes = orderedTabbables.sort(sortOrderedTabbables).map(function (a) {
    return a.node;
  }).concat(regularTabbables);
  return tabbableNodes;
};

var focusable = function focusable2(el, options) {
  options = options || {};
  var candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorFocusable.bind(null, options));
  return candidates;
};

var focusableCandidateSelector = /* @__PURE__ */candidateSelectors.concat("iframe").join(",");

var isFocusable = function isFocusable2(node, options) {
  options = options || {};

  if (!node) {
    throw new Error("No node provided");
  }

  if (matches.call(node, focusableCandidateSelector) === false) {
    return false;
  }

  return isNodeMatchingSelectorFocusable(options, node);
}; // node_modules/focus-trap/dist/focus-trap.esm.js

/*!
* focus-trap 6.6.1
* @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
*/


function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);

    if (enumerableOnly) {
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }

    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var activeFocusTraps = function () {
  var trapQueue = [];
  return {
    activateTrap: function activateTrap(trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];

        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },
    deactivateTrap: function deactivateTrap(trap) {
      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    }
  };
}();

var isSelectableInput = function isSelectableInput2(node) {
  return node.tagName && node.tagName.toLowerCase() === "input" && typeof node.select === "function";
};

var isEscapeEvent = function isEscapeEvent2(e) {
  return e.key === "Escape" || e.key === "Esc" || e.keyCode === 27;
};

var isTabEvent = function isTabEvent2(e) {
  return e.key === "Tab" || e.keyCode === 9;
};

var delay = function delay2(fn) {
  return setTimeout(fn, 0);
};

var findIndex = function findIndex2(arr, fn) {
  var idx = -1;
  arr.every(function (value, i) {
    if (fn(value)) {
      idx = i;
      return false;
    }

    return true;
  });
  return idx;
};

var valueOrHandler = function valueOrHandler2(value) {
  for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    params[_key - 1] = arguments[_key];
  }

  return typeof value === "function" ? value.apply(void 0, params) : value;
};

var createFocusTrap = function createFocusTrap2(elements, userOptions) {
  var doc = document;

  var config = _objectSpread2({
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true
  }, userOptions);

  var state = {
    containers: [],
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    delayInitialFocusTimer: void 0
  };
  var trap;

  var getOption = function getOption2(configOverrideOptions, optionName, configOptionName) {
    return configOverrideOptions && configOverrideOptions[optionName] !== void 0 ? configOverrideOptions[optionName] : config[configOptionName || optionName];
  };

  var containersContain = function containersContain2(element) {
    return state.containers.some(function (container) {
      return container.contains(element);
    });
  };

  var getNodeForOption = function getNodeForOption2(optionName) {
    var optionValue = config[optionName];

    if (!optionValue) {
      return null;
    }

    var node = optionValue;

    if (typeof optionValue === "string") {
      node = doc.querySelector(optionValue);

      if (!node) {
        throw new Error("`".concat(optionName, "` refers to no known node"));
      }
    }

    if (typeof optionValue === "function") {
      node = optionValue();

      if (!node) {
        throw new Error("`".concat(optionName, "` did not return a node"));
      }
    }

    return node;
  };

  var getInitialFocusNode = function getInitialFocusNode2() {
    var node;

    if (getOption({}, "initialFocus") === false) {
      return false;
    }

    if (getNodeForOption("initialFocus") !== null) {
      node = getNodeForOption("initialFocus");
    } else if (containersContain(doc.activeElement)) {
      node = doc.activeElement;
    } else {
      var firstTabbableGroup = state.tabbableGroups[0];
      var firstTabbableNode = firstTabbableGroup && firstTabbableGroup.firstTabbableNode;
      node = firstTabbableNode || getNodeForOption("fallbackFocus");
    }

    if (!node) {
      throw new Error("Your focus-trap needs to have at least one focusable element");
    }

    return node;
  };

  var updateTabbableNodes = function updateTabbableNodes2() {
    state.tabbableGroups = state.containers.map(function (container) {
      var tabbableNodes = tabbable(container);

      if (tabbableNodes.length > 0) {
        return {
          container,
          firstTabbableNode: tabbableNodes[0],
          lastTabbableNode: tabbableNodes[tabbableNodes.length - 1]
        };
      }

      return void 0;
    }).filter(function (group) {
      return !!group;
    });

    if (state.tabbableGroups.length <= 0 && !getNodeForOption("fallbackFocus")) {
      throw new Error("Your focus-trap must have at least one container with at least one tabbable node in it at all times");
    }
  };

  var tryFocus = function tryFocus2(node) {
    if (node === false) {
      return;
    }

    if (node === doc.activeElement) {
      return;
    }

    if (!node || !node.focus) {
      tryFocus2(getInitialFocusNode());
      return;
    }

    node.focus({
      preventScroll: !!config.preventScroll
    });
    state.mostRecentlyFocusedNode = node;

    if (isSelectableInput(node)) {
      node.select();
    }
  };

  var getReturnFocusNode = function getReturnFocusNode2(previousActiveElement) {
    var node = getNodeForOption("setReturnFocus");
    return node ? node : previousActiveElement;
  };

  var checkPointerDown = function checkPointerDown2(e) {
    if (containersContain(e.target)) {
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      trap.deactivate({
        returnFocus: config.returnFocusOnDeactivate && !isFocusable(e.target)
      });
      return;
    }

    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }

    e.preventDefault();
  };

  var checkFocusIn = function checkFocusIn2(e) {
    var targetContained = containersContain(e.target);

    if (targetContained || e.target instanceof Document) {
      if (targetContained) {
        state.mostRecentlyFocusedNode = e.target;
      }
    } else {
      e.stopImmediatePropagation();
      tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
    }
  };

  var checkTab = function checkTab2(e) {
    updateTabbableNodes();
    var destinationNode = null;

    if (state.tabbableGroups.length > 0) {
      var containerIndex = findIndex(state.tabbableGroups, function (_ref) {
        var container = _ref.container;
        return container.contains(e.target);
      });

      if (containerIndex < 0) {
        if (e.shiftKey) {
          destinationNode = state.tabbableGroups[state.tabbableGroups.length - 1].lastTabbableNode;
        } else {
          destinationNode = state.tabbableGroups[0].firstTabbableNode;
        }
      } else if (e.shiftKey) {
        var startOfGroupIndex = findIndex(state.tabbableGroups, function (_ref2) {
          var firstTabbableNode = _ref2.firstTabbableNode;
          return e.target === firstTabbableNode;
        });

        if (startOfGroupIndex < 0 && state.tabbableGroups[containerIndex].container === e.target) {
          startOfGroupIndex = containerIndex;
        }

        if (startOfGroupIndex >= 0) {
          var destinationGroupIndex = startOfGroupIndex === 0 ? state.tabbableGroups.length - 1 : startOfGroupIndex - 1;
          var destinationGroup = state.tabbableGroups[destinationGroupIndex];
          destinationNode = destinationGroup.lastTabbableNode;
        }
      } else {
        var lastOfGroupIndex = findIndex(state.tabbableGroups, function (_ref3) {
          var lastTabbableNode = _ref3.lastTabbableNode;
          return e.target === lastTabbableNode;
        });

        if (lastOfGroupIndex < 0 && state.tabbableGroups[containerIndex].container === e.target) {
          lastOfGroupIndex = containerIndex;
        }

        if (lastOfGroupIndex >= 0) {
          var _destinationGroupIndex = lastOfGroupIndex === state.tabbableGroups.length - 1 ? 0 : lastOfGroupIndex + 1;

          var _destinationGroup = state.tabbableGroups[_destinationGroupIndex];
          destinationNode = _destinationGroup.firstTabbableNode;
        }
      }
    } else {
      destinationNode = getNodeForOption("fallbackFocus");
    }

    if (destinationNode) {
      e.preventDefault();
      tryFocus(destinationNode);
    }
  };

  var checkKey = function checkKey2(e) {
    if (isEscapeEvent(e) && valueOrHandler(config.escapeDeactivates) !== false) {
      e.preventDefault();
      trap.deactivate();
      return;
    }

    if (isTabEvent(e)) {
      checkTab(e);
      return;
    }
  };

  var checkClick = function checkClick2(e) {
    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      return;
    }

    if (containersContain(e.target)) {
      return;
    }

    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
  };

  var addListeners = function addListeners2() {
    if (!state.active) {
      return;
    }

    activeFocusTraps.activateTrap(trap);
    state.delayInitialFocusTimer = config.delayInitialFocus ? delay(function () {
      tryFocus(getInitialFocusNode());
    }) : tryFocus(getInitialFocusNode());
    doc.addEventListener("focusin", checkFocusIn, true);
    doc.addEventListener("mousedown", checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener("touchstart", checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener("click", checkClick, {
      capture: true,
      passive: false
    });
    doc.addEventListener("keydown", checkKey, {
      capture: true,
      passive: false
    });
    return trap;
  };

  var removeListeners = function removeListeners2() {
    if (!state.active) {
      return;
    }

    doc.removeEventListener("focusin", checkFocusIn, true);
    doc.removeEventListener("mousedown", checkPointerDown, true);
    doc.removeEventListener("touchstart", checkPointerDown, true);
    doc.removeEventListener("click", checkClick, true);
    doc.removeEventListener("keydown", checkKey, true);
    return trap;
  };

  trap = {
    activate: function activate(activateOptions) {
      if (state.active) {
        return this;
      }

      var onActivate = getOption(activateOptions, "onActivate");
      var onPostActivate = getOption(activateOptions, "onPostActivate");
      var checkCanFocusTrap = getOption(activateOptions, "checkCanFocusTrap");

      if (!checkCanFocusTrap) {
        updateTabbableNodes();
      }

      state.active = true;
      state.paused = false;
      state.nodeFocusedBeforeActivation = doc.activeElement;

      if (onActivate) {
        onActivate();
      }

      var finishActivation = function finishActivation2() {
        if (checkCanFocusTrap) {
          updateTabbableNodes();
        }

        addListeners();

        if (onPostActivate) {
          onPostActivate();
        }
      };

      if (checkCanFocusTrap) {
        checkCanFocusTrap(state.containers.concat()).then(finishActivation, finishActivation);
        return this;
      }

      finishActivation();
      return this;
    },
    deactivate: function deactivate(deactivateOptions) {
      if (!state.active) {
        return this;
      }

      clearTimeout(state.delayInitialFocusTimer);
      state.delayInitialFocusTimer = void 0;
      removeListeners();
      state.active = false;
      state.paused = false;
      activeFocusTraps.deactivateTrap(trap);
      var onDeactivate = getOption(deactivateOptions, "onDeactivate");
      var onPostDeactivate = getOption(deactivateOptions, "onPostDeactivate");
      var checkCanReturnFocus = getOption(deactivateOptions, "checkCanReturnFocus");

      if (onDeactivate) {
        onDeactivate();
      }

      var returnFocus = getOption(deactivateOptions, "returnFocus", "returnFocusOnDeactivate");

      var finishDeactivation = function finishDeactivation2() {
        delay(function () {
          if (returnFocus) {
            tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
          }

          if (onPostDeactivate) {
            onPostDeactivate();
          }
        });
      };

      if (returnFocus && checkCanReturnFocus) {
        checkCanReturnFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation)).then(finishDeactivation, finishDeactivation);
        return this;
      }

      finishDeactivation();
      return this;
    },
    pause: function pause() {
      if (state.paused || !state.active) {
        return this;
      }

      state.paused = true;
      removeListeners();
      return this;
    },
    unpause: function unpause() {
      if (!state.paused || !state.active) {
        return this;
      }

      state.paused = false;
      updateTabbableNodes();
      addListeners();
      return this;
    },
    updateContainerElements: function updateContainerElements(containerElements) {
      var elementsAsArray = [].concat(containerElements).filter(Boolean);
      state.containers = elementsAsArray.map(function (element) {
        return typeof element === "string" ? doc.querySelector(element) : element;
      });

      if (state.active) {
        updateTabbableNodes();
      }

      return this;
    }
  };
  trap.updateContainerElements(elements);
  return trap;
}; // packages/focus/src/index.js


function src_default$2(Alpine) {
  let lastFocused;
  let currentFocused;
  window.addEventListener("focusin", () => {
    lastFocused = currentFocused;
    currentFocused = document.activeElement;
  });
  Alpine.magic("focus", el => {
    let within = el;
    return {
      __noscroll: false,
      __wrapAround: false,

      within(el2) {
        within = el2;
        return this;
      },

      withoutScrolling() {
        this.__noscroll = true;
        return this;
      },

      noscroll() {
        this.__noscroll = true;
        return this;
      },

      withWrapAround() {
        this.__wrapAround = true;
        return this;
      },

      wrap() {
        return this.withWrapAround();
      },

      focusable(el2) {
        return isFocusable(el2);
      },

      previouslyFocused() {
        return lastFocused;
      },

      lastFocused() {
        return lastFocused;
      },

      focused() {
        return currentFocused;
      },

      focusables() {
        if (Array.isArray(within)) return within;
        return focusable(within, {
          displayCheck: "none"
        });
      },

      all() {
        return this.focusables();
      },

      isFirst(el2) {
        let els = this.all();
        return els[0] && els[0].isSameNode(el2);
      },

      isLast(el2) {
        let els = this.all();
        return els.length && els.slice(-1)[0].isSameNode(el2);
      },

      getFirst() {
        return this.all()[0];
      },

      getLast() {
        return this.all().slice(-1)[0];
      },

      getNext() {
        let list = this.all();
        let current = document.activeElement;
        if (list.indexOf(current) === -1) return;

        if (this.__wrapAround && list.indexOf(current) === list.length - 1) {
          return list[0];
        }

        return list[list.indexOf(current) + 1];
      },

      getPrevious() {
        let list = this.all();
        let current = document.activeElement;
        if (list.indexOf(current) === -1) return;

        if (this.__wrapAround && list.indexOf(current) === 0) {
          return list.slice(-1)[0];
        }

        return list[list.indexOf(current) - 1];
      },

      first() {
        this.focus(this.getFirst());
      },

      last() {
        this.focus(this.getLast());
      },

      next() {
        this.focus(this.getNext());
      },

      previous() {
        this.focus(this.getPrevious());
      },

      prev() {
        return this.previous();
      },

      focus(el2) {
        if (!el2) return;
        setTimeout(() => {
          if (!el2.hasAttribute("tabindex")) el2.setAttribute("tabindex", "0");
          el2.focus({
            preventScroll: this._noscroll
          });
        });
      }

    };
  });
  Alpine.directive("trap", Alpine.skipDuringClone((el, _ref57, _ref58) => {
    let {
      expression,
      modifiers
    } = _ref57;
    let {
      effect,
      evaluateLater,
      cleanup
    } = _ref58;
    let evaluator = evaluateLater(expression);
    let oldValue = false;
    let trap = createFocusTrap(el, {
      escapeDeactivates: false,
      allowOutsideClick: true,
      fallbackFocus: () => el
    });

    let undoInert = () => {};

    let undoDisableScrolling = () => {};

    const releaseFocus = () => {
      undoInert();

      undoInert = () => {};

      undoDisableScrolling();

      undoDisableScrolling = () => {};

      trap.deactivate({
        returnFocus: !modifiers.includes("noreturn")
      });
    };

    effect(() => evaluator(value => {
      if (oldValue === value) return;

      if (value && !oldValue) {
        setTimeout(() => {
          if (modifiers.includes("inert")) undoInert = setInert(el);
          if (modifiers.includes("noscroll")) undoDisableScrolling = disableScrolling();
          trap.activate();
        });
      }

      if (!value && oldValue) {
        releaseFocus();
      }

      oldValue = !!value;
    }));
    cleanup(releaseFocus);
  }, (el, _ref59, _ref60) => {
    let {
      expression,
      modifiers
    } = _ref59;
    let {
      evaluate
    } = _ref60;
    if (modifiers.includes("inert") && evaluate(expression)) setInert(el);
  }));
}

function setInert(el) {
  let undos = [];
  crawlSiblingsUp(el, sibling => {
    let cache = sibling.hasAttribute("aria-hidden");
    sibling.setAttribute("aria-hidden", "true");
    undos.push(() => cache || sibling.removeAttribute("aria-hidden"));
  });
  return () => {
    while (undos.length) undos.pop()();
  };
}

function crawlSiblingsUp(el, callback) {
  if (el.isSameNode(document.body) || !el.parentNode) return;
  Array.from(el.parentNode.children).forEach(sibling => {
    if (!sibling.isSameNode(el)) callback(sibling);
    crawlSiblingsUp(el.parentNode, callback);
  });
}

function disableScrolling() {
  let overflow = document.documentElement.style.overflow;
  let paddingRight = document.documentElement.style.paddingRight;
  let scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
  return () => {
    document.documentElement.style.overflow = overflow;
    document.documentElement.style.paddingRight = paddingRight;
  };
} // packages/focus/builds/module.js


var module_default$2 = src_default$2; // packages/collapse/src/index.js

function src_default$1(Alpine) {
  Alpine.directive("collapse", (el, _ref61, _ref62) => {
    let {
      expression,
      modifiers
    } = _ref61;
    let {
      effect,
      evaluateLater
    } = _ref62;
    let duration = modifierValue(modifiers, "duration", 250) / 1e3;
    let floor = 0;
    if (!el._x_isShown) el.style.height = `${floor}px`;
    if (!el._x_isShown) el.hidden = true;
    if (!el._x_isShown) el.style.overflow = "hidden";

    let setFunction = (el2, styles) => {
      let revertFunction = Alpine.setStyles(el2, styles);
      return styles.height ? () => {} : revertFunction;
    };

    let transitionStyles = {
      transitionProperty: "height",
      transitionDuration: `${duration}s`,
      transitionTimingFunction: "cubic-bezier(0.4, 0.0, 0.2, 1)"
    };
    el._x_transition = {
      in() {
        let before = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : () => {};
        let after = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => {};
        el.hidden = false;
        el.style.display = null;
        let current = el.getBoundingClientRect().height;
        el.style.height = "auto";
        let full = el.getBoundingClientRect().height;

        if (current === full) {
          current = floor;
        }

        Alpine.transition(el, Alpine.setStyles, {
          during: transitionStyles,
          start: {
            height: current + "px"
          },
          end: {
            height: full + "px"
          }
        }, () => el._x_isShown = true, () => {
          if (el.style.height == `${full}px`) {
            el.style.overflow = null;
          }
        });
      },

      out() {
        let before = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : () => {};
        let after = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => {};
        let full = el.getBoundingClientRect().height;
        Alpine.transition(el, setFunction, {
          during: transitionStyles,
          start: {
            height: full + "px"
          },
          end: {
            height: floor + "px"
          }
        }, () => el.style.overflow = "hidden", () => {
          el._x_isShown = false;

          if (el.style.height == `${floor}px`) {
            el.style.display = "none";
            el.hidden = true;
          }
        });
      }

    };
  });
}

function modifierValue(modifiers, key, fallback) {
  if (modifiers.indexOf(key) === -1) return fallback;
  const rawValue = modifiers[modifiers.indexOf(key) + 1];
  if (!rawValue) return fallback;

  if (key === "duration") {
    let match = rawValue.match(/([0-9]+)ms/);
    if (match) return match[1];
  }

  return rawValue;
} // packages/collapse/builds/module.js


var module_default$1 = src_default$1; // packages/morph/src/dom.js

var DomManager = class DomManager {
  constructor(el) {
    _defineProperty2(this, "el", void 0);

    _defineProperty2(this, "traversals", {
      first: "firstElementChild",
      next: "nextElementSibling",
      parent: "parentElement"
    });

    this.el = el;
  }

  nodes() {
    this.traversals = {
      first: "firstChild",
      next: "nextSibling",
      parent: "parentNode"
    };
    return this;
  }

  first() {
    return this.teleportTo(this.el[this.traversals["first"]]);
  }

  next() {
    return this.teleportTo(this.teleportBack(this.el[this.traversals["next"]]));
  }

  before(insertee) {
    this.el[this.traversals["parent"]].insertBefore(insertee, this.el);
    return insertee;
  }

  replace(replacement) {
    this.el[this.traversals["parent"]].replaceChild(replacement, this.el);
    return replacement;
  }

  append(appendee) {
    this.el.appendChild(appendee);
    return appendee;
  }

  teleportTo(el) {
    if (!el) return el;
    if (el._x_teleport) return el._x_teleport;
    return el;
  }

  teleportBack(el) {
    if (!el) return el;
    if (el._x_teleportBack) return el._x_teleportBack;
    return el;
  }

};

function dom(el) {
  return new DomManager(el);
}

function createElement(html) {
  return document.createRange().createContextualFragment(html).firstElementChild;
}

function textOrComment(el) {
  return el.nodeType === 3 || el.nodeType === 8;
} // packages/morph/src/morph.js


var resolveStep = () => {};

var logger = () => {};

async function morph(from, toHtml, options) {
  let fromEl;
  let toEl;
  let key, lookahead, updating, updated, removing, removed, adding, added, debug;

  function breakpoint(message) {
    if (!debug) return;
    logger((message || "").replace("\n", "\\n"), fromEl, toEl);
    return new Promise(resolve => resolveStep = () => resolve());
  }

  function assignOptions() {
    let options2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    let defaultGetKey = el => el.getAttribute("key");

    let noop = () => {};

    updating = options2.updating || noop;
    updated = options2.updated || noop;
    removing = options2.removing || noop;
    removed = options2.removed || noop;
    adding = options2.adding || noop;
    added = options2.added || noop;
    key = options2.key || defaultGetKey;
    lookahead = options2.lookahead || false;
    debug = options2.debug || false;
  }

  async function patch(from2, to) {
    if (differentElementNamesTypesOrKeys(from2, to)) {
      let result = patchElement(from2, to);
      await breakpoint("Swap elements");
      return result;
    }

    let updateChildrenOnly = false;
    if (shouldSkip(updating, from2, to, () => updateChildrenOnly = true)) return;
    window.Alpine && initializeAlpineOnTo(from2, to);

    if (textOrComment(to)) {
      await patchNodeValue(from2, to);
      updated(from2, to);
      return;
    }

    if (!updateChildrenOnly) {
      await patchAttributes(from2, to);
    }

    updated(from2, to);
    await patchChildren(from2, to);
  }

  function differentElementNamesTypesOrKeys(from2, to) {
    return from2.nodeType != to.nodeType || from2.nodeName != to.nodeName || getKey(from2) != getKey(to);
  }

  function patchElement(from2, to) {
    if (shouldSkip(removing, from2)) return;
    let toCloned = to.cloneNode(true);
    if (shouldSkip(adding, toCloned)) return;
    dom(from2).replace(toCloned);
    removed(from2);
    added(toCloned);
  }

  async function patchNodeValue(from2, to) {
    let value = to.nodeValue;

    if (from2.nodeValue !== value) {
      from2.nodeValue = value;
      await breakpoint("Change text node to: " + value);
    }
  }

  async function patchAttributes(from2, to) {
    if (from2._x_isShown && !to._x_isShown) {
      return;
    }

    if (!from2._x_isShown && to._x_isShown) {
      return;
    }

    let domAttributes = Array.from(from2.attributes);
    let toAttributes = Array.from(to.attributes);

    for (let i = domAttributes.length - 1; i >= 0; i--) {
      let name = domAttributes[i].name;

      if (!to.hasAttribute(name)) {
        from2.removeAttribute(name);
        await breakpoint("Remove attribute");
      }
    }

    for (let i = toAttributes.length - 1; i >= 0; i--) {
      let name = toAttributes[i].name;
      let value = toAttributes[i].value;

      if (from2.getAttribute(name) !== value) {
        from2.setAttribute(name, value);
        await breakpoint(`Set [${name}] attribute to: "${value}"`);
      }
    }
  }

  async function patchChildren(from2, to) {
    let domChildren = from2.childNodes;
    let toChildren = to.childNodes;
    keyToMap(toChildren);
    let domKeyDomNodeMap = keyToMap(domChildren);
    let currentTo = dom(to).nodes().first();
    let currentFrom = dom(from2).nodes().first();
    let domKeyHoldovers = {};

    while (currentTo) {
      let toKey = getKey(currentTo);
      let domKey = getKey(currentFrom);

      if (!currentFrom) {
        if (toKey && domKeyHoldovers[toKey]) {
          let holdover = domKeyHoldovers[toKey];
          dom(from2).append(holdover);
          currentFrom = holdover;
          await breakpoint("Add element (from key)");
        } else {
          let added2 = addNodeTo(currentTo, from2) || {};
          await breakpoint("Add element: " + (added2.outerHTML || added2.nodeValue));
          currentTo = dom(currentTo).nodes().next();
          continue;
        }
      }

      if (lookahead) {
        let nextToElementSibling = dom(currentTo).next();
        let found = false;

        while (!found && nextToElementSibling) {
          if (currentFrom.isEqualNode(nextToElementSibling)) {
            found = true;
            currentFrom = addNodeBefore(currentTo, currentFrom);
            domKey = getKey(currentFrom);
            await breakpoint("Move element (lookahead)");
          }

          nextToElementSibling = dom(nextToElementSibling).next();
        }
      }

      if (toKey !== domKey) {
        if (!toKey && domKey) {
          domKeyHoldovers[domKey] = currentFrom;
          currentFrom = addNodeBefore(currentTo, currentFrom);
          domKeyHoldovers[domKey].remove();
          currentFrom = dom(currentFrom).nodes().next();
          currentTo = dom(currentTo).nodes().next();
          await breakpoint('No "to" key');
          continue;
        }

        if (toKey && !domKey) {
          if (domKeyDomNodeMap[toKey]) {
            currentFrom = dom(currentFrom).replace(domKeyDomNodeMap[toKey]);
            await breakpoint('No "from" key');
          }
        }

        if (toKey && domKey) {
          domKeyHoldovers[domKey] = currentFrom;
          let domKeyNode = domKeyDomNodeMap[toKey];

          if (domKeyNode) {
            currentFrom = dom(currentFrom).replace(domKeyNode);
            await breakpoint('Move "from" key');
          } else {
            domKeyHoldovers[domKey] = currentFrom;
            currentFrom = addNodeBefore(currentTo, currentFrom);
            domKeyHoldovers[domKey].remove();
            currentFrom = dom(currentFrom).next();
            currentTo = dom(currentTo).next();
            await breakpoint("Swap elements with keys");
            continue;
          }
        }
      }

      let currentFromNext = currentFrom && dom(currentFrom).nodes().next();
      await patch(currentFrom, currentTo);
      currentTo = currentTo && dom(currentTo).nodes().next();
      currentFrom = currentFromNext;
    }

    let removals = [];

    while (currentFrom) {
      if (!shouldSkip(removing, currentFrom)) removals.push(currentFrom);
      currentFrom = dom(currentFrom).nodes().next();
    }

    while (removals.length) {
      let domForRemoval = removals.shift();
      domForRemoval.remove();
      await breakpoint("remove el");
      removed(domForRemoval);
    }
  }

  function getKey(el) {
    return el && el.nodeType === 1 && key(el);
  }

  function keyToMap(els) {
    let map = {};
    els.forEach(el => {
      let theKey = getKey(el);

      if (theKey) {
        map[theKey] = el;
      }
    });
    return map;
  }

  function addNodeTo(node, parent) {
    if (!shouldSkip(adding, node)) {
      let clone = node.cloneNode(true);
      dom(parent).append(clone);
      added(clone);
      return clone;
    }

    return null;
  }

  function addNodeBefore(node, beforeMe) {
    if (!shouldSkip(adding, node)) {
      let clone = node.cloneNode(true);
      dom(beforeMe).before(clone);
      added(clone);
      return clone;
    }

    return beforeMe;
  }

  assignOptions(options);
  fromEl = from;
  toEl = createElement(toHtml);

  if (window.Alpine && window.Alpine.closestDataStack && !from._x_dataStack) {
    toEl._x_dataStack = window.Alpine.closestDataStack(from);
    toEl._x_dataStack && window.Alpine.clone(from, toEl);
  }

  await breakpoint();
  await patch(from, toEl);
  fromEl = void 0;
  toEl = void 0;
  return from;
}

morph.step = () => resolveStep();

morph.log = theLogger => {
  logger = theLogger;
};

function shouldSkip(hook) {
  let skip = false;

  for (var _len6 = arguments.length, args = new Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
    args[_key6 - 1] = arguments[_key6];
  }

  hook(...args, () => skip = true);
  return skip;
}

function initializeAlpineOnTo(from, to, childrenOnly) {
  if (from.nodeType !== 1) return;

  if (from._x_dataStack) {
    window.Alpine.clone(from, to);
  }
} // packages/morph/src/index.js


function src_default(Alpine) {
  Alpine.morph = morph;
} // packages/morph/builds/module.js


var module_default = src_default;
/**
 * Utility helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions for dealing with arrays and objects
 *
 * @namespace utils
 */

/**
 * Wrap tables in a container div to make them scrollable when needed
 *
 * @param {object} options - Options to be used
 * @param {NodeList} options.tables - Elements of the table(s) to wrap
 * @param {string} options.tableWrapperClass - table wrapper class name
 */

function wrapTable(options) {
  options.tables.forEach(function (table) {
    var wrapper = document.createElement('div');
    wrapper.classList.add(options.tableWrapperClass);
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}
/**
 * Wrap iframes in a container div to make them responsive
 *
 * @param {object} options - Options to be used
 * @param {NodeList} options.iframes - Elements of the iframe(s) to wrap
 * @param {string} options.iframeWrapperClass - class name used on the wrapping div
 */


function wrapIframe(options) {
  options.iframes.forEach(function (iframe) {
    var wrapper = document.createElement('div');
    wrapper.classList.add(options.iframeWrapperClass);
    iframe.parentNode.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
    iframe.src = iframe.src;
  });
}
/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */


const moneyFormat = '${{amount}}';
/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */

function formatMoney(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }

  let value = '';
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || moneyFormat;

  function formatWithDelimiters(number) {
    let precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    let thousands = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ',';
    let decimal = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '.';

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);
    const parts = number.split('.');
    const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
    const centsAmount = parts[1] ? decimal + parts[1] : '';
    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;

    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;

    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;

    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}
/**
 * Generic live region announcement
 *
 */


function liveRegion(content, clear) {
  clearTimeout(window.liveRegionTimeout);
  let region = document.getElementById('screenreader-announce');
  region.innerHTML = content;
  window.liveRegionTimeout = setTimeout(() => {
    region.innerHTML = '';
  }, 3000);
}

function cartLiveRegion(item) {
  const templateString = theme.strings.update + ': [QuantityLabel]: [Quantity], [Regular] [$$] [DiscountedPrice] [$]. [PriceInformation]';

  function _liveRegionContent() {
    let liveRegionContent = templateString;
    liveRegionContent = liveRegionContent.replace('[QuantityLabel]', theme.strings.quantity).replace('[Quantity]', item.quantity);
    let regularLabel = '';
    let regularPrice = formatMoney(item.original_line_price, theme.moneyFormat);
    let discountLabel = '';
    let discountPrice = '';
    let discountInformation = '';

    if (item.original_line_price > item.final_line_price) {
      regularLabel = theme.strings.regularTotal;
      discountLabel = theme.strings.discountedTotal;
      discountPrice = formatMoney(item.final_line_price, theme.moneyFormat);
      discountInformation = theme.strings.priceColumn;
    }

    liveRegionContent = liveRegionContent.replace('[Regular]', regularLabel).replace('[$$]', regularPrice).replace('[DiscountedPrice]', discountLabel).replace('[$]', discountPrice).replace('[PriceInformation]', discountInformation).replace('  .', '').trim();
    return liveRegionContent;
  }

  liveRegion(_liveRegionContent());
}

function variantLiveRegion(variant) {
  const templateString = '[Availability] [Regular] [$$] [Sale] [$]. [UnitPrice] [$$$]';

  function _getBaseUnit() {
    if (variant.unit_price_measurement.reference_value === 1) {
      return variant.unit_price_measurement.reference_unit;
    }

    return variant.unit_price_measurement.reference_value + variant.unit_price_measurement.reference_unit;
  }
  /**
   * Compose the live region’s content based on the
   * variant’s properties.
   *
   * @param {Object} variant The variant
   */


  function _liveRegionContent() {
    let liveRegionContent = templateString; // Update availability

    const availability = variant.available ? '' : theme.strings.soldOut + ',';
    liveRegionContent = liveRegionContent.replace('[Availability]', availability); // Update pricing

    let regularLabel = '';
    let regularPrice = formatMoney(variant.price, theme.moneyFormat);
    let saleLabel = '',
        salePrice = '',
        unitLabel = '',
        unitPrice = '';

    if (variant.compare_at_price > variant.price) {
      regularLabel = theme.strings.regularPrice;
      regularPrice = formatMoney(variant.compare_at_price, theme.moneyFormat);
      saleLabel = theme.strings.sale;
      salePrice = formatMoney(variant.price, theme.moneyFormat);
    }

    if (variant.unit_price) {
      unitLabel = theme.strings.unitPrice;
      unitPrice = formatMoney(variant.unit_price, theme.moneyFormat) + ' ' + theme.strings.unitPriceSeparator + ' ' + _getBaseUnit();
    }

    liveRegionContent = liveRegionContent.replace('[Regular]', regularLabel).replace('[$$]', regularPrice).replace('[Sale]', saleLabel).replace('[$]', salePrice).replace('[UnitPrice]', unitLabel).replace('[$$$]', unitPrice).replace('  .', '').trim();
    return liveRegionContent;
  }

  liveRegion(_liveRegionContent());
}
/*! outline.js v1.2.0 - https://github.com/lindsayevans/outline.js/ */
// modified by Switch Themes to use body classname instead of adding a style tag


(function (d) {
  const dom_events = ('addEventListener' in d);

  const add_event_listener = function (type, callback) {
    // Basic cross-browser event handling
    if (dom_events) {
      d.addEventListener(type, callback);
    } else {
      d.attachEvent('on' + type, callback);
    }
  }; // Using mousedown instead of mouseover, so that previously focused elements don't lose focus ring on mouse move


  add_event_listener('mousedown', function () {
    document.body.classList.add("user-using-mouse");
  });
  add_event_listener('keydown', function () {
    document.body.classList.remove("user-using-mouse");
  });
})(document);

module_default$4.plugin(module_default$3);
module_default$4.plugin(module_default$2);
module_default$4.plugin(module_default$1);
module_default$4.plugin(module_default);
window.Alpine = module_default$4;
window.Spruce = module_default$4;
window.liveRegion = liveRegion;
window.variantLiveRegion = variantLiveRegion;
window.cartLiveRegion = cartLiveRegion;

if (!window.formatMoney) {
  window.formatMoney = formatMoney;
}

var tableSelectors = '.rte table';
wrapTable({
  tables: document.querySelectorAll(tableSelectors),
  tableWrapperClass: 'table-wrapper'
});
var iframeSelectors = '.rte iframe[src*="youtube.com/embed"],' + '.rte iframe[src*="player.vimeo"]';
wrapIframe({
  iframes: document.querySelectorAll(iframeSelectors),
  iframeWrapperClass: 'video-wrapper'
});
console.log('Shapes theme (2.0.4) by SWITCH | Make the switch: https://switchthemes.co');
