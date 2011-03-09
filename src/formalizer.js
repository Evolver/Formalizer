
(function( api, $){

var undefined;

// overall interface for formalizer objects
var Formalizer =Class( undefined, undefined, function( proto, parent){
	
	// associated element
	proto.$elem =null;
	proto.elem =null;
	
	// attach to an element
	proto.attach =function( elem) {
		
		if( this.elem !==null) {
			// detach current element
			this.detach();
		}
		
		// associate to element
		elem.formalizer =this;
		
		// reference element
		this.elem =elem;
		this.$elem =$(elem);
		
		// attached
		return true;
	};
	
	// detach from element
	proto.detach =function() {
		
		if( this.elem ===null) {
			// not attached
			return false;
		}
		
		// dereference formalizer
		this.elem.formalizer =undefined;
		
		// dereference element
		this.elem =null;
		this.$elem =null;
		
		// detached
		return true;
	};
});

// form object
var Form =api.Form =Class( Formalizer, undefined, function( proto, parent) {
	
	// validity flag
	proto.valid =undefined;
	
	// event proxy handler container object.
	// NOTE: initialized in attach() method.
	proto.eventProxy =undefined;
	
	// list of changed inputs.
	// NOTE: initialized in attach() method.
	proto.changedInputs =undefined;
	
	// list of invalid inputs.
	// NOTE: initialized in attach() method.
	proto.invalidInputs =undefined;
	
	// attach to an element (redefinition)
	proto.attach =function( elem) {
		
		if( !parent.attach.call( this, elem)) {
			// attach function is not available
			return false;
		}
		
		// create event proxy container object
		this.eventProxy ={};
		
		// bind event listeners
		this.$elem.bind( 'submit', this.eventProxy.submit =GetProxyFunction( this.constructor.prototype.event_submit, this));
		this.$elem.bind( 'reset', this.eventProxy.reset =GetProxyFunction( this.constructor.prototype.event_reset, this));
		this.$elem.bind( 'commit', this.eventProxy.commit =GetProxyFunction( this.constructor.prototype.event_commit, this));
		
		// initialize invalid input array
		this.invalidInputs =[];
		
		// initialize changed input array
		this.changedInputs =[];

		// attached
		return true;
	};
	
	// detach from an element (redefinition)
	proto.detach =function() {
		
		// reference element objects
		var elem =this.elem;
		var $elem =this.$elem;
		
		if( !parent.detach.call( this)) {
			// already detached
			return false;
		}
		
		for( var eventType in this.eventProxy) {
			// detach all event handlers one by one
			$elem.unbind( eventType, this.eventProxy[ eventType]);
		}
		
		// reset event proxy handler object
		this.eventProxy ={};
		
		// remove all system attributes
		this.$elem
			.removeAttr( 'data-mutated')
			.removeAttr( 'data-invalid');
		
		// detached
		return true;
	};
	
	// attach all inputs to form
	proto.attachInputs =function() {
		
		for( var i =0; i < this.elem.elements.length; ++i) {
			// reference element
			var elem =this.elem.elements[ i];
			
			if( elem.nodeName =='INPUT') {
				
				if( elem.type =='text' || elem.type =='password') {
					// initialize text input
					(new api.TextInput()).attach( elem);
					
				} else if( elem.type =='checkbox' || elem.type =='radio') {
					// initialize checkbox or radiobox
					(new api.CheckInput()).attach( elem);
					
				} else if( elem.type =='submit' || elem.type =='button' || elem.type =='reset') {
					// initialize button
					(new api.ButtonInput()).attach( elem);
				}
				
			} else if( elem.nodeName =='SELECT') {
				// initialize select box
				(new api.SelectInput()).attach( elem);
				
			} else if( elem.nodeName =='TEXTAREA') {
				// initialize textarea
				(new api.TextInput()).attach( elem);
				
			} else if( elem.nodeName =='BUTTON') {
				// initialize button
				(new api.ButtonInput()).attach( elem);
			}
		}
	};
	
	// detach all inputs off form
	proto.detachInputs =function() {
		
		for( var i =0; i < this.elem.elements.length; ++i) {
			// reference element
			var elem =this.elem.elements[ i];
			
			if( elem.formalizer ===undefined) {
				// element is not initialized by formalizer
				continue;
			}
			
			// detach from element
			elem.formalizer.detach();
		}
	};
	
	// "submit" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_submit =function( e) {
	};
	
	// "reset" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_reset =function( e) {
		// fire reset event on all input elements
		TriggerEventHandlers( $( GetFormElements( this.elem)), 'reset');
	};
	
	// "commit" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_commit =function( e) {
	};
	
	// commit changes on all form's elements
	proto.commit =function() {
		// commit changes on all form elements
		for( var i =0; i < this.elem.elements.length; ++i) {
			// commit changes on an element
			CommitElementChanges( this.elem.elements[ i]);
		}
		
		// trigger commit handlers on elements
		TriggerEventHandlers( $( GetFormElements( this.elem)), 'commit');
		
		// trigger commit handler on form
		TriggerEventHandlers( this.$elem, 'commit');
	};
	
	// focus first form's element
	proto.focus =function() {
		
		for( var i =0; i < this.elem.elements.length; ++i) {
			// reference element
			var el =this.elem.elements[ i];
			
			if( el.type =='INPUT') {
				
				if( el.type =='hidden') {
					// skip hidden inputs
					continue;
					
				} else if( el.type =='button') {
					// skip buttons
					continue;
					
				} else if( el.type =='submit') {
					// skip submit buttons
					continue;
					
				} else if( el.type =='reset') {
					// skip reset buttons
					continue;
				}
			}
			
			// focus element
			el.focus();
			break;
		}
	};
	
	// checks if form's input is valid.
	proto.isValid =function() {
		return this.invalidInputs.length ==0;
	};
	
	// add invalid input element
	proto.addInvalidInput =function( elem) {
		// add input element to array
		this.invalidInputs.push( elem);
		
		if( this.invalidInputs.length ==1) {
			// first element added, form has become invalid
			this.$elem.attr( 'data-invalid', 'invalid');
			
			// redraw
			Redraw( this.elem);
		}
	};
	
	// remove invalid input element
	proto.removeInvalidInput =function( elem) {
		
		if( this.invalidInputs.length ==0) {
			// no invalid elements available
			return;
		}
		
		// seek for element in invalid input array
		for( var i =0; i < this.invalidInputs.length; ++i) {
			
			if( elem !==this.invalidInputs[ i]) {
				// not an element of interest
				continue;
			}
			
			// remove element from array
			this.invalidInputs.splice( i, 1);
			break;
		}
		
		if( this.invalidInputs.length ==0) {
			// last element removed, form has become valid
			this.$elem.removeAttr( 'data-invalid');
			
			// redraw
			Redraw( this.elem);
		}
	};
	
	// checks if form's input is changed since last reset.
	proto.isChanged =function() {
		return this.changedInputs.length ==0;
	};
	
	// add changed input element
	proto.addChangedInput =function( elem) {
		// add input element to array
		this.changedInputs.push( elem);
		
		if( this.changedInputs.length ==1) {
			// first element added, form has become changed
			this.$elem.attr( 'data-mutated', 'mutated');
			
			// redraw
			Redraw( this.elem);
		}
	};
	
	// remove changed input element
	proto.removeChangedInput =function( elem) {
		
		if( this.changedInputs.length ==0) {
			// no changed elements available
			return;
		}
		
		// seek for element in changed input array
		for( var i =0; i < this.changedInputs.length; ++i) {
			
			if( elem !==this.changedInputs[ i]) {
				// not an element of interest
				continue;
			}
			
			// remove element from array
			this.changedInputs.splice( i, 1);
			break;
		}
		
		if( this.changedInputs.length ==0) {
			// last element removed, form has become unchanged
			this.$elem.removeAttr( 'data-mutated');
			
			// redraw
			Redraw( this.elem);
		}
	};
	
});

// form input's constructor object
var Input =api.Input =Class( Formalizer, function() {
	// execute parent constructor
	Formalizer.call( this);
	
}, function( proto, parent){
	
	// validity state.
	proto.valid =undefined;
	
	// changed state.
	proto.changed =undefined;
	
	// event proxy handler container object.
	// NOTE: initialized in attach() method.
	proto.eventProxy =undefined;
	
	// list of additional filters for current element.
	// NOTE: initialied in attach() method.
	proto.filters =undefined;
	
	// list of additional validators for current element.
	// NOTE: initialied in attach() method.
	proto.validators =undefined;
	
	// attach to an element (redefinition)
	proto.attach =function( elem) {
		
		if( !parent.attach.call( this, elem)) {
			// attach function is not available
			return false;
		}
		
		// create event proxy container object
		this.eventProxy ={};
		
		// bind event listeners
		this.$elem.bind( 'focus', this.eventProxy.focus =GetProxyFunction( this.constructor.prototype.event_focus, this));
		this.$elem.bind( 'blur', this.eventProxy.blur =GetProxyFunction( this.constructor.prototype.event_blur, this));
		this.$elem.bind( 'click', this.eventProxy.click =GetProxyFunction( this.constructor.prototype.event_click, this));
		this.$elem.bind( 'keydown', this.eventProxy.keydown =GetProxyFunction( this.constructor.prototype.event_keydown, this));
		this.$elem.bind( 'keypress', this.eventProxy.keypress =GetProxyFunction( this.constructor.prototype.event_keypress, this));
		this.$elem.bind( 'keyup', this.eventProxy.keyup =GetProxyFunction( this.constructor.prototype.event_keyup, this));
		this.$elem.bind( 'mousedown', this.eventProxy.mousedown =GetProxyFunction( this.constructor.prototype.event_mousedown, this));
		this.$elem.bind( 'mouseup', this.eventProxy.mouseup =GetProxyFunction( this.constructor.prototype.event_mouseup, this));
		this.$elem.bind( 'change', this.eventProxy.change =GetProxyFunction( this.constructor.prototype.event_change, this));
		this.$elem.bind( 'restore', this.eventProxy.restore =GetProxyFunction( this.constructor.prototype.event_restore, this));
		this.$elem.bind( 'reset', this.eventProxy.reset =GetProxyFunction( this.constructor.prototype.event_reset, this));
		this.$elem.bind( 'commit', this.eventProxy.commit =GetProxyFunction( this.constructor.prototype.event_commit, this));
		this.$elem.bind( 'valid', this.eventProxy.valid =GetProxyFunction( this.constructor.prototype.event_valid, this));
		this.$elem.bind( 'invalid', this.eventProxy.invalid =GetProxyFunction( this.constructor.prototype.event_invalid, this));

		ExecuteDelayed( function(){
			if( !this.isDefault()) {
				// fire change event because default value is not the same
				TriggerEventHandlers( this.$elem, 'change');
			}
		}, undefined, this);
		
		// create validator array
		this.validators =[];
		
		// create filter array
		this.filters =[];

		// attached
		return true;
	};
	
	// detach from an element (redefinition)
	proto.detach =function() {
		
		// reference element objects
		var elem =this.elem;
		var $elem =this.$elem;
		
		if( !parent.detach.call( this)) {
			// already detached
			return false;
		}
		
		for( var eventType in this.eventProxy) {
			// detach all event handlers one by one
			$elem.unbind( eventType, this.eventProxy[ eventType]);
		}
		
		// reset event proxy handler object
		this.eventProxy ={};
		
		// remove all system attributes (if any)
		$elem
			.removeAttr( 'data-mutated')
			.removeAttr( 'data-focused')
			.removeAttr( 'data-invalid');
		
		if( elem.form !==null && elem.form.formalizer !==undefined) {
			// remove element from form
			elem.form.formalizer.removeChangedInput( elem);
			elem.form.formalizer.removeInvalidInput( elem);
		}
		
		// detached
		return true;
	};
	
	// "focus" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_focus =function( e) {
		// assign attribute
		this.$elem.attr( 'data-focused', 'focused');
		
		// redraw
		Redraw( this.elem);
	};
	
	// "blur" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_blur =function( e) {
		// reassign attribute
		this.$elem.removeAttr( 'data-focused');
		
		// execute filter methods
		this.applyFilters();
		
		// redraw
		Redraw( this.elem);
	};
	
	// "click" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_click =function( e) {
	};
	
	// "keydown" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_keydown =function( e) {
	};
	
	// "keypress" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_keypress =function( e) {
	};
	
	// "keyup" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_keyup =function( e) {
	};
	
	// "mousedown" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_mousedown =function( e) {
		// store current state
		this.storeState();
	};
	
	// "mouseup" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_mouseup =function( e) {
		
		if( this.stateChanged()) {
			// fire change event
			TriggerEventHandlers( this.$elem, 'change');
		}
	};
	
	// "change" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_change =function( e) {
		
		if( this.changed ===undefined || !this.changed) {
			// state has changed
			this.$elem.attr( 'data-mutated', 'mutated');
			
			if( this.elem.form !==undefined && this.elem.form.formalizer !==undefined) {
				// report to form that element has changed
				this.elem.form.formalizer.addChangedInput( this.elem);
			}
			
			// assign new state
			this.changed =true;
		}
		
		// redraw element
		Redraw( this.elem);
	};
	
	// "restore" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_restore =function( e) {
		// remove invalid attribute
		this.$elem.removeAttr( 'data-invalid');
		
		if( this.changed !==undefined && this.changed) {
			// state has changed
			this.$elem.removeAttr( 'data-mutated');
			
			if( this.elem.form !==undefined && this.elem.form.formalizer !==undefined) {
				// report to form that element has restored it's change state
				this.elem.form.formalizer.removeChangedInput( this.elem);
			}
			
			// assign new state
			this.changed =false;
		}
		
		// redraw element
		Redraw( this.elem);
	};
	
	// "reset" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_reset =function( e) {
		// trigger restore event
		TriggerEventHandlers( this.$elem, 'restore');
	};
	
	// "commit" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_commit =function( e) {
		// trigger restore event
		TriggerEventHandlers( this.$elem, 'restore');
	};
	
	// "valid" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_valid =function( e) {
		// remove attribute
		this.$elem.removeAttr( 'data-invalid');
		
		if( this.elem.form !==undefined && this.elem.form.formalizer !==undefined) {
			// report to form that element has become valid
			this.elem.form.formalizer.removeInvalidInput( this.elem);
		}
		
		// redraw
		Redraw( this.elem);
	};
	
	// "invalid" event handler.
	// NOTE: override in subclass to add custom functionality.
	proto.event_invalid =function( e) {
		// assign attribute
		this.$elem.attr( 'data-invalid', 'invalid');
		
		if( this.elem.form !==undefined && this.elem.form.formalizer !==undefined) {
			// report to form that element has become invalid
			this.elem.form.formalizer.addInvalidInput( this.elem);
		}
		
		// redraw
		Redraw( this.elem);
	};
	
	// get default value or state of an associated element.
	// NOTE: override in subclass to add custom functionality.
	proto.getDefault =function() {
		throw 'Override to add functionality';
	};
	
	// resets element to it's default state or value.
	// NOTE: override in subclass to add custom functionality.
	proto.reset =function() {
		throw 'Override to add functionality';
	};
	
	// checks whether input is in default value state.
	// NOTE: override in subclass to add custom functionality.
	proto.isDefault =function() {
		throw 'Override to add functionality';
	};
	
	// stores current state information.
	// NOTE: override in subclass to add custom functionality.
	proto.storeState =function() {
		throw 'Override to add functionality';
	};
	
	// verifies if state changed since last call to storeState().
	// NOTE: override in subclass to add custom functionality.
	proto.stateChanged =function() {
		throw 'Override to add functionality';
	};
	
	// commit changes on an element
	proto.commit =function() {
		// commit changes on element
		CommitElementChanges( this.elem);
		
		// fire commit event
		TriggerEventHandlers( this.$elem, 'commit');
	};
	
	// check whether input is valid.
	// NOTE: override in subclass to add custom functionality.
	proto.isValid =function() {
		// execute all validator methods
		for( var i =0; i < this.validators.length; ++i) {
			if( !this.validators[ i].call( this)) {
				// validation function failed
				return false;
			}
		}
		
		// no validation functions failed
		return true;
	};
	
	// add validation callback.
	proto.addValidator =function( callback) {
		this.validators.push( callback);
	};
	
	// remove validator callback
	proto.removeValidator =function( callback) {
		for( var i =0; i < this.validators.length; ++i) {
			
			if( this.validators[ i] !==callback) {
				// not a callback of interest
				continue;
			}
			
			// remove callback
			this.validators.splice( i, 1);
			break;
		}
	};
	
	// apply filters.
	proto.applyFilters =function() {
		// execute filter methods one by one
		for( var i =0; i < this.filters.length; ++i) {

			if( this.filters[ i].call( this)) {
				// filter has changed input's value, trigger change
				TriggerEventHandlers( this.$elem, 'change');
			}
		}
	};
	
	// add filter callback.
	proto.addFilter =function( callback) {
		this.filters.push( callback);
	};
	
	// remove filter callback
	proto.removeFilter =function( callback) {
		for( var i =0; i < this.filters.length; ++i) {
			
			if( this.filters[ i] !==callback) {
				// not a callback of interest
				continue;
			}
			
			// remove callback
			this.filters.splice( i, 1);
			break;
		}
	};
	
});

// submit, reset, button
var ButtonInput =api.ButtonInput =Class( Input, function(){
	// call parent constructor
	Input.call( this);
	
}, function( proto, parent){
	
	// get default value or state of an associated element.
	proto.getDefault =function() {
		// no default values for current input type
		return undefined;
	};
	
	// resets element to it's default state or value.
	proto.reset =function() {
		// input can not be reset
	};
	
	// checks whether input is in default value state.
	proto.isDefault =function() {
		// input is always at it's default state
		return true;
	};
	
	// stores current state information.
	proto.storeState =function() {
		// do nothing
	};
	
	// verifies if state changed since last call to storeState().
	proto.stateChanged =function() {
		// state never changes for this type of input
		return false;
	};
	
});

// checkbox or radiobox object
var CheckInput =api.CheckInput =Class( Input, function() {
	// call parent constructor
	Input.call( this);
	
}, function( proto, parent){
	
	// get default value or state of an associated element.
	proto.getDefault =function() {
		return this.elem.defaultChecked;
	};
	
	// resets element to it's default state or value.
	proto.reset =function() {
		// reset to default value
		this.elem.checked =this.getDefault();
		
		// trigger reset event
		TriggerEventHandlers( this.$elem, 'reset');
	};
	
	// checks whether input is in default value state.
	proto.isDefault =function() {
		return this.elem.checked ==this.getDefault();
	};
	
	// stores current state information.
	proto.storeState =function() {
		// do nothing
	};
	
	// verifies if state changed since last call to storeState().
	proto.stateChanged =function() {
		// state never changes for this type of input
		return false;
	};
	
});

// text input object
var TextInput =api.TextInput =Class( Input, function() {
	// call parent constructor
	Input.call( this);
	
}, function( proto, parent){
	
	// min length for input.
	// NOTE: is initialized to string in attach() method.
	proto.minLength =undefined;
	
	// max length for input.
	// NOTE: is initialized to string in attach() method.
	proto.maxLength =undefined;
	
	// regular expression to match input against.
	// NOTE: is initialized to RegExp object.
	proto.regexp =undefined;
	
	// attach to an element (redefinition)
	proto.attach =function( elem) {
		
		if( !parent.attach.call( this, elem)) {
			// attach function is not available
			return false;
		}
		
		// load attribute value
		this.regexp =GetAttributeValue( elem, 'data-regexp');
		this.minLength =GetAttributeValue( elem, 'minlength');
		this.maxLength =GetAttributeValue( elem, 'maxlength');

		if( this.regexp ===undefined || this.regexp =='') {
			// no regular expression entered
			this.regexp =undefined;
			
		} else {
			// read regexp flags (if any)
			var regexpFlags =GetAttributeValue( elem, 'data-regexp-flags');
			
			// initialize regexp object
			this.regexp =new RegExp( this.regexp, regexpFlags ===undefined ? '' :  regexpFlags);
		}
		
		if( this.minLength !==undefined) {
			// parse integer
			this.minLength =parseInt( this.minLength);
		}
		
		if( this.maxLength !==undefined) {
			// parse integer
			this.maxLength =parseInt( this.maxLength);
		}
		
		// attached
		return true;
	};
	
	// detach from an element (redefinition)
	proto.detach =function() {
		
		// reference element objects
		var elem =this.elem;
		var $elem =this.$elem;
		
		if( !parent.detach.call( this)) {
			// already detached
			return false;
		}
		
		// perform additional detach tasks
		
		// detached
		return true;
	};
	
	// "focus" event handler.
	proto.event_focus =function( e) {
		// execute parent method
		parent.event_focus.apply( this, arguments);
		
		// select all contents of element
		ExecuteDelayed( function(){
			
			if( document.activeElement ===this.elem) {
				// select contents only if current element is still active
				this.elem.select();
			}
			
		}, undefined, this);
	};
	
	// "blur" event handler.
	proto.event_blur =function( e) {
		// trim input whenever element is blurred
		this.trim();
		
		// constrain input's length
		this.constrainLength();
		
		// execute parent method
		parent.event_blur.apply( this, arguments);
	};
	
	// "keydown" event handler.
	proto.event_keydown =function( e) {
		// reference current object
		
		if( e.which ==27) {
			// blur element
			this.elem.blur();
			
			if( this.elem.form !==null) {
				// reset form whenever escape key is pressed
				this.elem.form.reset();
				
			} else {
				// reset element
				this.reset();
			}
			
			// prevent default action
			e.preventDefault();

		} else if( e.which ==13) {
			// enter key pressed

			if( this.elem.nodeName =='TEXTAREA') {
				// do not process enter key when pressed within textarea
				
			} else {
				// submit form whenever enter key is pressed
				
				if( this.elem.form !==null) {
					// submit form
					$(this.elem.form).submit();
				}
				
				// prevent default action
				e.preventDefault();
			}
			
		} else if( e.which ==9) {
			// tabulation character pressed
			
		} else if( e.which ==18) {
			// ALT key is pressed
			
		} else if( e.which ==17) {
			// CONTROL key is pressed
			
		} else if( e.which ==16) {
			// SHIFT key is pressed
			
		} else if( e.which ==20) {
			// CAPS LOCK key is pressed
			
		} else if( e.which ==144) {
			// NUM LOCK key is pressed

		} else if( e.which ==145) {
			// SCROLL LOCK lock key is pressed

		} else if( e.which ==33) {
			// PAGE UP key is pressed

		} else if( e.which ==34) {
			// PAGE DOWN key is pressed

		} else if( e.which ==35) {
			// END key is pressed

		} else if( e.which ==36) {
			// HOME key is pressed

		} else if( e.which ==45) {
			// INSERT key is pressed

		} else {
			// another key was pressed
			
			// store current state
			this.storeState();
		}
	};
	
	// "keypress" event handler.
	proto.event_keypress =function( e) {
		
		if( e.which ==13) {
			// enter key pressed

			if( this.elem.nodeName =='TEXTAREA') {
				// do not process enter key when pressed within textarea
				
			} else {
				// Opera has bug, that submits form second time after "keypress" event is processed internally.
				// We ignore processing of enter keys at this step so that form is not submitted two times.
				
				// prevent default action
				e.preventDefault();
			}
		}
		
	};
	
	// "keyup" event handler.
	proto.event_keyup =function( e) {
		
		// constrain length
		this.constrainLength();
		
		if( this.stateChanged()) {
			// fire change event
			TriggerEventHandlers( this.$elem, 'change');
		}
	};
	
	// "change" event handler.
	proto.event_change =function( e) {
		
		// get current validity state
		var valid =this.isValid();
		
		if( this.valid ===undefined || this.valid !=valid) {
			// validity state changes
			
			if( !valid) {
				// input is not valid
				TriggerEventHandlers( this.$elem, 'invalid');
				
			} else {
				// input is valid
				TriggerEventHandlers( this.$elem, 'valid');
			}
			
			// assign new state
			this.valid =valid;
		}
		
		// execute parent method
		parent.event_change.apply( this, arguments);
	};
	
	// check whether input is valid.
	proto.isValid =function() {
		
		if( !parent.isValid.call( this)) {
			// not valid according to parent method
			return false;
		}
		
		if( this.maxLength !==undefined && this.elem.value.length > this.maxLength) {
			// too long
			return false;
		}
		
		if( this.minLength !==undefined && this.elem.value.length < this.minLength) {
			// too short
			return false;
		}
		
		if( this.regexp !==undefined && !this.regexp.test( this.elem.value)) {
			// invalid
			return false;
		}
		
		// valid
		return true;
	};
	
	// get default value or state of an associated element.
	// NOTE: override in subclass to add custom functionality.
	proto.getDefault =function() {
		return this.elem.defaultValue;
	};
	
	// resets element to it's default state or value.
	// NOTE: override in subclass to add custom functionality.
	proto.reset =function() {
		// reset value
		this.elem.value =this.getDefault();
		
		// trigger reset event
		TriggerEventHandlers( this.$elem, 'reset');
	};
	
	// checks whether input is in default value state.
	proto.isDefault =function() {
		return this.elem.value ==this.getDefault();
	};
	
	// stores current state information.
	proto.storeState =function() {
		// remember current length of element
		this.__stateRemembered =true;
		this.__valueIsDefault =this.isDefault();
		this.__valueLength =this.elem.value.length;
	};
	
	// verifies if state changed since last call to storeState().
	proto.stateChanged =function() {
		// flag: did value of input change?
		var changed =false;
		
		if( this.__stateRemembered ===undefined) {
			// state was not remembered (call to storeState() is required
			//  before calling this method)
			return false;
		}
		
		if( this.__valueIsDefault !=this.isDefault()) {
			// changed
			changed =true;
			
		} else if( this.__valueLength !=this.elem.value.length) {
			// changed
			changed =true;
			
		} else {
			// didn't change
		}
		
		// undefine temporary variables
		delete this.__stateRemembered;
		delete this.__valueIsDefault;
		delete this.__valueLength;
		
		// return info
		return changed;
	};
	
	// trims data input
	proto.trim =function() {
		// read value of element
		var value =this.elem.value;
		var i;
		
		// checks whether character is a space character
		function IsSpace( char) {
			return 	char ==' ' ||
							char =="\t" ||
							char =="\r" ||
							char =="\n";
		};
		
		// trim left side
		while( value.length && IsSpace( value[0])) {
			// remove first char
			value =value.substr( 1);
		}
		
		// trim right side
		while( value.length && IsSpace( value[ i =value.length -1])) {
			// remove last char
			value =value.substr( 0, i);
		}
		
		// determine if change event needs to be triggered
		var triggerChange =(this.elem.value !=value);
		
		// assign new value
		this.elem.value =value;
		
		if( triggerChange) {
			// trigger change event
			TriggerEventHandlers( this.$elem, 'change');
		}
	};
	
	// constrain input's length
	proto.constrainLength =function(){
		// reference element's value
		var value =this.elem.value;
		
		if( this.maxLength !==undefined && this.elem.value.length > this.maxLength) {
			// too long, cut the string
			value =this.elem.value.substr( 0, this.maxLength);
		}
		
		// determine if change event needs to be triggered
		var triggerChange =(this.elem.value !=value);
		
		// assign new value
		this.elem.value =value;
		
		if( triggerChange) {
			// trigger change event
			TriggerEventHandlers( this.$elem, 'change');
		}
	};
	
});

// select box input
var SelectInput =api.SelectInput =Class( Input, function(){
	// execute parent constructor
	Input.call( this);
	
}, function( proto, parent){
	
	// get default value or state of an associated element.
	proto.getDefault =function() {
		
		// calculate list of options that is selected by default
		var defaultOpts =[];
		var i;
		
		for( i =0; i < this.elem.options.length; ++i) {
			// refrence option
			var opt =this.elem.options[ i];
			
			if( opt.defaultSelected) {
				// selected by default
				defaultOpts.push( opt);
			}
		}
		
		if( this.elem.multiple) {
			// multiple value select box
			return defaultOpts;
			
		} else {
			// single value select box
			
			if( defaultOpts.length ==0) {
				// no value selected by default
				return undefined;
				
			} else {
				// pick first checkbox that is selected by default
				return defaultOpts.pop();
			}
		}
	};
	
	// get list of selected options
	proto.getSelected =function() {
		// options to return
		var opts =[];
		
		// iterate option list
		for( var i =0; i < this.elem.options.length; ++i) {
			// refrence option
			var opt =this.elem.options[ i];
			
			if( opt.selected) {
				// selected
				opts.push( opt);
			}
		}
		
		if( this.elem.multiple) {
			// multiple options can be selected
			return opts;
			
		} else {
			// single option can be selected
			
			if( opts.length ==0) {
				// no option selected
				return undefined;
				
			} else {
				// return first option selected
				return opts.pop();
			}
		}
		
	};
	
	// resets element to it's default state or value.
	proto.reset =function() {
		// iterate options
		for( var i =0; i < this.elem.options.length; ++i) {
			// reference option
			var opt =this.elem.options[ i];

			// assign selection
			opt.selected =opt.defaultSelected;
		}
		
		// trigger reset event
		TriggerEventHandlers( this.$elem, 'reset');
	};
	
	// checks whether input is in default value state.
	proto.isDefault =function() {
		// iterate options
		for( var i =0; i < this.elem.options.length; ++i) {
			// reference option
			var opt =this.elem.options[ i];

			if( opt.selected !=opt.defaultSelected) {
				// not in default state
				return false;
			}
		}
		
		// in default state
		return true;
	};
	
	// stores current state information.
	proto.storeState =function() {
		// do nothing
	};
	
	// verifies if state changed since last call to storeState().
	proto.stateChanged =function() {
		// state never changes for this type of input
		return false;
	};
	
}); 

// transfers values from one object to another
function Inherit( from, to) {
	var k;
	for( k in from) {
		to[ k] =from[ k];
	}
};

// get value of an attribute
function GetAttributeValue( elem, attrName) {
	// reference attribute node
	var node =elem.getAttributeNode( attrName);
	
	if( node ===null) {
		// no value is set
		return undefined;
	}
	
	// return value
	return node.nodeValue;
};

// get event proxy function
function GetProxyFunction( callback, thisArg) {
	// return proxy function
	return function(){
		// execute callback in context of thisArg
		return callback.apply( thisArg, arguments);
	};
};

// execute delayed callback
function ExecuteDelayed( callback, delay, thisArg, args) {
	if( delay ===undefined) delay =0;
	if( args ===undefined) args =[];
	
	// execute delayed
	setTimeout( function(){
		callback.apply( thisArg, args);
	}, delay);
};

// force redraw of element
function Redraw( elem) {
	elem.className =elem.className;
};

// trigger all event handlers
function TriggerEventHandlers( $elems, eventType) {
	$elems.each( function(){
		$(this).triggerHandler( eventType);
	});
};

// commit changes on element
function CommitElementChanges( elem) {

	if( elem.nodeName =='INPUT') {
		
		if( elem.type =='checkbox' || elem.type =='radio') {
			// radio or checkbox
			elem.defaultChecked =elem.checked;
			
		} else {
			// other input type
			elem.defaultValue =elem.value;
		}
		
	} else if( elem.nodeName =='TEXTAREA') {
		// textarea input
		elem.defaultValue =elem.value;
		
	} else if( elem.nodeName =='SELECT') {
		// select box
		
		for( var i =0; i < elem.options.length; ++i) {
			// reference option
			var opt =elem.options[ i];
			
			// assign selection
			opt.defaultSelected =opt.selected;
		}
		
	} else {
		// commit not supported for specified element
	}
};

// get element array of form.
function GetFormElements( form) {
	// data to return
	var ret =[];
	var i;
	
	for( i =0; i < form.elements.length; ++i)
		ret.push( form.elements[ i]);
	
	// return element array
	return ret;
};

// defines new class
function Class( parent, constr, proto) {
	
	if( constr ===undefined) {
		// allocate new anonymous function
		constr =function(){};
	}
	
	if( parent !==undefined) {
		// copy prototype items to constructible object
		for( var k in parent.prototype)
			constr.prototype[ k] =parent.prototype[ k];
	}
	
	if( proto !==undefined) {
		// execute prototype definition function
		proto.call( undefined, constr.prototype, parent ===undefined ? undefined : parent.prototype);
	}
	
	// return new object
	return constr;
};
	
})( window.formalizer ={}, jQuery);