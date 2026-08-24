var _d=Object.defineProperty;var Sd=(h,i,a)=>i in h?_d(h,i,{enumerable:!0,configurable:!0,writable:!0,value:a}):h[i]=a;var M=(h,i,a)=>Sd(h,typeof i!="symbol"?i+"":i,a);function wd(h){return h&&h.__esModule&&Object.prototype.hasOwnProperty.call(h,"default")?h.default:h}var $i={exports:{}},Pn={},Xi={exports:{}},Z={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var nc;function xd(){if(nc)return Z;nc=1;var h=Symbol.for("react.element"),i=Symbol.for("react.portal"),a=Symbol.for("react.fragment"),u=Symbol.for("react.strict_mode"),f=Symbol.for("react.profiler"),y=Symbol.for("react.provider"),w=Symbol.for("react.context"),S=Symbol.for("react.forward_ref"),C=Symbol.for("react.suspense"),E=Symbol.for("react.memo"),A=Symbol.for("react.lazy"),N=Symbol.iterator;function D(m){return m===null||typeof m!="object"?null:(m=N&&m[N]||m["@@iterator"],typeof m=="function"?m:null)}var B={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},z=Object.assign,I={};function O(m,T,J){this.props=m,this.context=T,this.refs=I,this.updater=J||B}O.prototype.isReactComponent={},O.prototype.setState=function(m,T){if(typeof m!="object"&&typeof m!="function"&&m!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,m,T,"setState")},O.prototype.forceUpdate=function(m){this.updater.enqueueForceUpdate(this,m,"forceUpdate")};function q(){}q.prototype=O.prototype;function K(m,T,J){this.props=m,this.context=T,this.refs=I,this.updater=J||B}var re=K.prototype=new q;re.constructor=K,z(re,O.prototype),re.isPureReactComponent=!0;var H=Array.isArray,de=Object.prototype.hasOwnProperty,ue={current:null},pe={key:!0,ref:!0,__self:!0,__source:!0};function Ce(m,T,J){var te,oe={},le=null,ce=null;if(T!=null)for(te in T.ref!==void 0&&(ce=T.ref),T.key!==void 0&&(le=""+T.key),T)de.call(T,te)&&!pe.hasOwnProperty(te)&&(oe[te]=T[te]);var ae=arguments.length-2;if(ae===1)oe.children=J;else if(1<ae){for(var ge=Array(ae),tt=0;tt<ae;tt++)ge[tt]=arguments[tt+2];oe.children=ge}if(m&&m.defaultProps)for(te in ae=m.defaultProps,ae)oe[te]===void 0&&(oe[te]=ae[te]);return{$$typeof:h,type:m,key:le,ref:ce,props:oe,_owner:ue.current}}function Ve(m,T){return{$$typeof:h,type:m.type,key:T,ref:m.ref,props:m.props,_owner:m._owner}}function qe(m){return typeof m=="object"&&m!==null&&m.$$typeof===h}function Ke(m){var T={"=":"=0",":":"=2"};return"$"+m.replace(/[=:]/g,function(J){return T[J]})}var Je=/\/+/g;function Oe(m,T){return typeof m=="object"&&m!==null&&m.key!=null?Ke(""+m.key):T.toString(36)}function Ze(m,T,J,te,oe){var le=typeof m;(le==="undefined"||le==="boolean")&&(m=null);var ce=!1;if(m===null)ce=!0;else switch(le){case"string":case"number":ce=!0;break;case"object":switch(m.$$typeof){case h:case i:ce=!0}}if(ce)return ce=m,oe=oe(ce),m=te===""?"."+Oe(ce,0):te,H(oe)?(J="",m!=null&&(J=m.replace(Je,"$&/")+"/"),Ze(oe,T,J,"",function(tt){return tt})):oe!=null&&(qe(oe)&&(oe=Ve(oe,J+(!oe.key||ce&&ce.key===oe.key?"":(""+oe.key).replace(Je,"$&/")+"/")+m)),T.push(oe)),1;if(ce=0,te=te===""?".":te+":",H(m))for(var ae=0;ae<m.length;ae++){le=m[ae];var ge=te+Oe(le,ae);ce+=Ze(le,T,J,ge,oe)}else if(ge=D(m),typeof ge=="function")for(m=ge.call(m),ae=0;!(le=m.next()).done;)le=le.value,ge=te+Oe(le,ae++),ce+=Ze(le,T,J,ge,oe);else if(le==="object")throw T=String(m),Error("Objects are not valid as a React child (found: "+(T==="[object Object]"?"object with keys {"+Object.keys(m).join(", ")+"}":T)+"). If you meant to render a collection of children, use an array instead.");return ce}function et(m,T,J){if(m==null)return m;var te=[],oe=0;return Ze(m,te,"","",function(le){return T.call(J,le,oe++)}),te}function Ie(m){if(m._status===-1){var T=m._result;T=T(),T.then(function(J){(m._status===0||m._status===-1)&&(m._status=1,m._result=J)},function(J){(m._status===0||m._status===-1)&&(m._status=2,m._result=J)}),m._status===-1&&(m._status=0,m._result=T)}if(m._status===1)return m._result.default;throw m._result}var he={current:null},F={transition:null},Y={ReactCurrentDispatcher:he,ReactCurrentBatchConfig:F,ReactCurrentOwner:ue};function j(){throw Error("act(...) is not supported in production builds of React.")}return Z.Children={map:et,forEach:function(m,T,J){et(m,function(){T.apply(this,arguments)},J)},count:function(m){var T=0;return et(m,function(){T++}),T},toArray:function(m){return et(m,function(T){return T})||[]},only:function(m){if(!qe(m))throw Error("React.Children.only expected to receive a single React element child.");return m}},Z.Component=O,Z.Fragment=a,Z.Profiler=f,Z.PureComponent=K,Z.StrictMode=u,Z.Suspense=C,Z.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Y,Z.act=j,Z.cloneElement=function(m,T,J){if(m==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+m+".");var te=z({},m.props),oe=m.key,le=m.ref,ce=m._owner;if(T!=null){if(T.ref!==void 0&&(le=T.ref,ce=ue.current),T.key!==void 0&&(oe=""+T.key),m.type&&m.type.defaultProps)var ae=m.type.defaultProps;for(ge in T)de.call(T,ge)&&!pe.hasOwnProperty(ge)&&(te[ge]=T[ge]===void 0&&ae!==void 0?ae[ge]:T[ge])}var ge=arguments.length-2;if(ge===1)te.children=J;else if(1<ge){ae=Array(ge);for(var tt=0;tt<ge;tt++)ae[tt]=arguments[tt+2];te.children=ae}return{$$typeof:h,type:m.type,key:oe,ref:le,props:te,_owner:ce}},Z.createContext=function(m){return m={$$typeof:w,_currentValue:m,_currentValue2:m,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},m.Provider={$$typeof:y,_context:m},m.Consumer=m},Z.createElement=Ce,Z.createFactory=function(m){var T=Ce.bind(null,m);return T.type=m,T},Z.createRef=function(){return{current:null}},Z.forwardRef=function(m){return{$$typeof:S,render:m}},Z.isValidElement=qe,Z.lazy=function(m){return{$$typeof:A,_payload:{_status:-1,_result:m},_init:Ie}},Z.memo=function(m,T){return{$$typeof:E,type:m,compare:T===void 0?null:T}},Z.startTransition=function(m){var T=F.transition;F.transition={};try{m()}finally{F.transition=T}},Z.unstable_act=j,Z.useCallback=function(m,T){return he.current.useCallback(m,T)},Z.useContext=function(m){return he.current.useContext(m)},Z.useDebugValue=function(){},Z.useDeferredValue=function(m){return he.current.useDeferredValue(m)},Z.useEffect=function(m,T){return he.current.useEffect(m,T)},Z.useId=function(){return he.current.useId()},Z.useImperativeHandle=function(m,T,J){return he.current.useImperativeHandle(m,T,J)},Z.useInsertionEffect=function(m,T){return he.current.useInsertionEffect(m,T)},Z.useLayoutEffect=function(m,T){return he.current.useLayoutEffect(m,T)},Z.useMemo=function(m,T){return he.current.useMemo(m,T)},Z.useReducer=function(m,T,J){return he.current.useReducer(m,T,J)},Z.useRef=function(m){return he.current.useRef(m)},Z.useState=function(m){return he.current.useState(m)},Z.useSyncExternalStore=function(m,T,J){return he.current.useSyncExternalStore(m,T,J)},Z.useTransition=function(){return he.current.useTransition()},Z.version="18.3.1",Z}var oc;function aa(){return oc||(oc=1,Xi.exports=xd()),Xi.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var lc;function Ed(){if(lc)return Pn;lc=1;var h=aa(),i=Symbol.for("react.element"),a=Symbol.for("react.fragment"),u=Object.prototype.hasOwnProperty,f=h.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,y={key:!0,ref:!0,__self:!0,__source:!0};function w(S,C,E){var A,N={},D=null,B=null;E!==void 0&&(D=""+E),C.key!==void 0&&(D=""+C.key),C.ref!==void 0&&(B=C.ref);for(A in C)u.call(C,A)&&!y.hasOwnProperty(A)&&(N[A]=C[A]);if(S&&S.defaultProps)for(A in C=S.defaultProps,C)N[A]===void 0&&(N[A]=C[A]);return{$$typeof:i,type:S,key:D,ref:B,props:N,_owner:f.current}}return Pn.Fragment=a,Pn.jsx=w,Pn.jsxs=w,Pn}var ic;function kd(){return ic||(ic=1,$i.exports=Ed()),$i.exports}var x=kd(),xe=aa();const Cd=wd(xe);var Vo={},Qi={exports:{}},Qe={},qi={exports:{}},Ki={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ac;function Td(){return ac||(ac=1,(function(h){function i(F,Y){var j=F.length;F.push(Y);e:for(;0<j;){var m=j-1>>>1,T=F[m];if(0<f(T,Y))F[m]=Y,F[j]=T,j=m;else break e}}function a(F){return F.length===0?null:F[0]}function u(F){if(F.length===0)return null;var Y=F[0],j=F.pop();if(j!==Y){F[0]=j;e:for(var m=0,T=F.length,J=T>>>1;m<J;){var te=2*(m+1)-1,oe=F[te],le=te+1,ce=F[le];if(0>f(oe,j))le<T&&0>f(ce,oe)?(F[m]=ce,F[le]=j,m=le):(F[m]=oe,F[te]=j,m=te);else if(le<T&&0>f(ce,j))F[m]=ce,F[le]=j,m=le;else break e}}return Y}function f(F,Y){var j=F.sortIndex-Y.sortIndex;return j!==0?j:F.id-Y.id}if(typeof performance=="object"&&typeof performance.now=="function"){var y=performance;h.unstable_now=function(){return y.now()}}else{var w=Date,S=w.now();h.unstable_now=function(){return w.now()-S}}var C=[],E=[],A=1,N=null,D=3,B=!1,z=!1,I=!1,O=typeof setTimeout=="function"?setTimeout:null,q=typeof clearTimeout=="function"?clearTimeout:null,K=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function re(F){for(var Y=a(E);Y!==null;){if(Y.callback===null)u(E);else if(Y.startTime<=F)u(E),Y.sortIndex=Y.expirationTime,i(C,Y);else break;Y=a(E)}}function H(F){if(I=!1,re(F),!z)if(a(C)!==null)z=!0,Ie(de);else{var Y=a(E);Y!==null&&he(H,Y.startTime-F)}}function de(F,Y){z=!1,I&&(I=!1,q(Ce),Ce=-1),B=!0;var j=D;try{for(re(Y),N=a(C);N!==null&&(!(N.expirationTime>Y)||F&&!Ke());){var m=N.callback;if(typeof m=="function"){N.callback=null,D=N.priorityLevel;var T=m(N.expirationTime<=Y);Y=h.unstable_now(),typeof T=="function"?N.callback=T:N===a(C)&&u(C),re(Y)}else u(C);N=a(C)}if(N!==null)var J=!0;else{var te=a(E);te!==null&&he(H,te.startTime-Y),J=!1}return J}finally{N=null,D=j,B=!1}}var ue=!1,pe=null,Ce=-1,Ve=5,qe=-1;function Ke(){return!(h.unstable_now()-qe<Ve)}function Je(){if(pe!==null){var F=h.unstable_now();qe=F;var Y=!0;try{Y=pe(!0,F)}finally{Y?Oe():(ue=!1,pe=null)}}else ue=!1}var Oe;if(typeof K=="function")Oe=function(){K(Je)};else if(typeof MessageChannel<"u"){var Ze=new MessageChannel,et=Ze.port2;Ze.port1.onmessage=Je,Oe=function(){et.postMessage(null)}}else Oe=function(){O(Je,0)};function Ie(F){pe=F,ue||(ue=!0,Oe())}function he(F,Y){Ce=O(function(){F(h.unstable_now())},Y)}h.unstable_IdlePriority=5,h.unstable_ImmediatePriority=1,h.unstable_LowPriority=4,h.unstable_NormalPriority=3,h.unstable_Profiling=null,h.unstable_UserBlockingPriority=2,h.unstable_cancelCallback=function(F){F.callback=null},h.unstable_continueExecution=function(){z||B||(z=!0,Ie(de))},h.unstable_forceFrameRate=function(F){0>F||125<F?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):Ve=0<F?Math.floor(1e3/F):5},h.unstable_getCurrentPriorityLevel=function(){return D},h.unstable_getFirstCallbackNode=function(){return a(C)},h.unstable_next=function(F){switch(D){case 1:case 2:case 3:var Y=3;break;default:Y=D}var j=D;D=Y;try{return F()}finally{D=j}},h.unstable_pauseExecution=function(){},h.unstable_requestPaint=function(){},h.unstable_runWithPriority=function(F,Y){switch(F){case 1:case 2:case 3:case 4:case 5:break;default:F=3}var j=D;D=F;try{return Y()}finally{D=j}},h.unstable_scheduleCallback=function(F,Y,j){var m=h.unstable_now();switch(typeof j=="object"&&j!==null?(j=j.delay,j=typeof j=="number"&&0<j?m+j:m):j=m,F){case 1:var T=-1;break;case 2:T=250;break;case 5:T=1073741823;break;case 4:T=1e4;break;default:T=5e3}return T=j+T,F={id:A++,callback:Y,priorityLevel:F,startTime:j,expirationTime:T,sortIndex:-1},j>m?(F.sortIndex=j,i(E,F),a(C)===null&&F===a(E)&&(I?(q(Ce),Ce=-1):I=!0,he(H,j-m))):(F.sortIndex=T,i(C,F),z||B||(z=!0,Ie(de))),F},h.unstable_shouldYield=Ke,h.unstable_wrapCallback=function(F){var Y=D;return function(){var j=D;D=Y;try{return F.apply(this,arguments)}finally{D=j}}}})(Ki)),Ki}var sc;function Rd(){return sc||(sc=1,qi.exports=Td()),qi.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var uc;function Ld(){if(uc)return Qe;uc=1;var h=aa(),i=Rd();function a(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,r=1;r<arguments.length;r++)t+="&args[]="+encodeURIComponent(arguments[r]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var u=new Set,f={};function y(e,t){w(e,t),w(e+"Capture",t)}function w(e,t){for(f[e]=t,e=0;e<t.length;e++)u.add(t[e])}var S=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),C=Object.prototype.hasOwnProperty,E=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,A={},N={};function D(e){return C.call(N,e)?!0:C.call(A,e)?!1:E.test(e)?N[e]=!0:(A[e]=!0,!1)}function B(e,t,r,n){if(r!==null&&r.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return n?!1:r!==null?!r.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function z(e,t,r,n){if(t===null||typeof t>"u"||B(e,t,r,n))return!0;if(n)return!1;if(r!==null)switch(r.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function I(e,t,r,n,o,l,s){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=n,this.attributeNamespace=o,this.mustUseProperty=r,this.propertyName=e,this.type=t,this.sanitizeURL=l,this.removeEmptyString=s}var O={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){O[e]=new I(e,0,!1,e,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];O[t]=new I(t,1,!1,e[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(e){O[e]=new I(e,2,!1,e.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){O[e]=new I(e,2,!1,e,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){O[e]=new I(e,3,!1,e.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(e){O[e]=new I(e,3,!0,e,null,!1,!1)}),["capture","download"].forEach(function(e){O[e]=new I(e,4,!1,e,null,!1,!1)}),["cols","rows","size","span"].forEach(function(e){O[e]=new I(e,6,!1,e,null,!1,!1)}),["rowSpan","start"].forEach(function(e){O[e]=new I(e,5,!1,e.toLowerCase(),null,!1,!1)});var q=/[\-:]([a-z])/g;function K(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(q,K);O[t]=new I(t,1,!1,e,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(q,K);O[t]=new I(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(q,K);O[t]=new I(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(e){O[e]=new I(e,1,!1,e.toLowerCase(),null,!1,!1)}),O.xlinkHref=new I("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(e){O[e]=new I(e,1,!1,e.toLowerCase(),null,!0,!0)});function re(e,t,r,n){var o=O.hasOwnProperty(t)?O[t]:null;(o!==null?o.type!==0:n||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(z(t,r,o,n)&&(r=null),n||o===null?D(t)&&(r===null?e.removeAttribute(t):e.setAttribute(t,""+r)):o.mustUseProperty?e[o.propertyName]=r===null?o.type===3?!1:"":r:(t=o.attributeName,n=o.attributeNamespace,r===null?e.removeAttribute(t):(o=o.type,r=o===3||o===4&&r===!0?"":""+r,n?e.setAttributeNS(n,t,r):e.setAttribute(t,r))))}var H=h.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,de=Symbol.for("react.element"),ue=Symbol.for("react.portal"),pe=Symbol.for("react.fragment"),Ce=Symbol.for("react.strict_mode"),Ve=Symbol.for("react.profiler"),qe=Symbol.for("react.provider"),Ke=Symbol.for("react.context"),Je=Symbol.for("react.forward_ref"),Oe=Symbol.for("react.suspense"),Ze=Symbol.for("react.suspense_list"),et=Symbol.for("react.memo"),Ie=Symbol.for("react.lazy"),he=Symbol.for("react.offscreen"),F=Symbol.iterator;function Y(e){return e===null||typeof e!="object"?null:(e=F&&e[F]||e["@@iterator"],typeof e=="function"?e:null)}var j=Object.assign,m;function T(e){if(m===void 0)try{throw Error()}catch(r){var t=r.stack.trim().match(/\n( *(at )?)/);m=t&&t[1]||""}return`
`+m+e}var J=!1;function te(e,t){if(!e||J)return"";J=!0;var r=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(_){var n=_}Reflect.construct(e,[],t)}else{try{t.call()}catch(_){n=_}e.call(t.prototype)}else{try{throw Error()}catch(_){n=_}e()}}catch(_){if(_&&n&&typeof _.stack=="string"){for(var o=_.stack.split(`
`),l=n.stack.split(`
`),s=o.length-1,c=l.length-1;1<=s&&0<=c&&o[s]!==l[c];)c--;for(;1<=s&&0<=c;s--,c--)if(o[s]!==l[c]){if(s!==1||c!==1)do if(s--,c--,0>c||o[s]!==l[c]){var d=`
`+o[s].replace(" at new "," at ");return e.displayName&&d.includes("<anonymous>")&&(d=d.replace("<anonymous>",e.displayName)),d}while(1<=s&&0<=c);break}}}finally{J=!1,Error.prepareStackTrace=r}return(e=e?e.displayName||e.name:"")?T(e):""}function oe(e){switch(e.tag){case 5:return T(e.type);case 16:return T("Lazy");case 13:return T("Suspense");case 19:return T("SuspenseList");case 0:case 2:case 15:return e=te(e.type,!1),e;case 11:return e=te(e.type.render,!1),e;case 1:return e=te(e.type,!0),e;default:return""}}function le(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case pe:return"Fragment";case ue:return"Portal";case Ve:return"Profiler";case Ce:return"StrictMode";case Oe:return"Suspense";case Ze:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case Ke:return(e.displayName||"Context")+".Consumer";case qe:return(e._context.displayName||"Context")+".Provider";case Je:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case et:return t=e.displayName||null,t!==null?t:le(e.type)||"Memo";case Ie:t=e._payload,e=e._init;try{return le(e(t))}catch{}}return null}function ce(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return le(t);case 8:return t===Ce?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function ae(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function ge(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function tt(e){var t=ge(e)?"checked":"value",r=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),n=""+e[t];if(!e.hasOwnProperty(t)&&typeof r<"u"&&typeof r.get=="function"&&typeof r.set=="function"){var o=r.get,l=r.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return o.call(this)},set:function(s){n=""+s,l.call(this,s)}}),Object.defineProperty(e,t,{enumerable:r.enumerable}),{getValue:function(){return n},setValue:function(s){n=""+s},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Dn(e){e._valueTracker||(e._valueTracker=tt(e))}function ua(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var r=t.getValue(),n="";return e&&(n=ge(e)?e.checked?"true":"false":e.value),e=n,e!==r?(t.setValue(e),!0):!1}function On(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function el(e,t){var r=t.checked;return j({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:r??e._wrapperState.initialChecked})}function ca(e,t){var r=t.defaultValue==null?"":t.defaultValue,n=t.checked!=null?t.checked:t.defaultChecked;r=ae(t.value!=null?t.value:r),e._wrapperState={initialChecked:n,initialValue:r,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function fa(e,t){t=t.checked,t!=null&&re(e,"checked",t,!1)}function tl(e,t){fa(e,t);var r=ae(t.value),n=t.type;if(r!=null)n==="number"?(r===0&&e.value===""||e.value!=r)&&(e.value=""+r):e.value!==""+r&&(e.value=""+r);else if(n==="submit"||n==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?rl(e,t.type,r):t.hasOwnProperty("defaultValue")&&rl(e,t.type,ae(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function da(e,t,r){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var n=t.type;if(!(n!=="submit"&&n!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,r||t===e.value||(e.value=t),e.defaultValue=t}r=e.name,r!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,r!==""&&(e.name=r)}function rl(e,t,r){(t!=="number"||On(e.ownerDocument)!==e)&&(r==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+r&&(e.defaultValue=""+r))}var Gr=Array.isArray;function _r(e,t,r,n){if(e=e.options,t){t={};for(var o=0;o<r.length;o++)t["$"+r[o]]=!0;for(r=0;r<e.length;r++)o=t.hasOwnProperty("$"+e[r].value),e[r].selected!==o&&(e[r].selected=o),o&&n&&(e[r].defaultSelected=!0)}else{for(r=""+ae(r),t=null,o=0;o<e.length;o++){if(e[o].value===r){e[o].selected=!0,n&&(e[o].defaultSelected=!0);return}t!==null||e[o].disabled||(t=e[o])}t!==null&&(t.selected=!0)}}function nl(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(a(91));return j({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function pa(e,t){var r=t.value;if(r==null){if(r=t.children,t=t.defaultValue,r!=null){if(t!=null)throw Error(a(92));if(Gr(r)){if(1<r.length)throw Error(a(93));r=r[0]}t=r}t==null&&(t=""),r=t}e._wrapperState={initialValue:ae(r)}}function ha(e,t){var r=ae(t.value),n=ae(t.defaultValue);r!=null&&(r=""+r,r!==e.value&&(e.value=r),t.defaultValue==null&&e.defaultValue!==r&&(e.defaultValue=r)),n!=null&&(e.defaultValue=""+n)}function ma(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function va(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function ol(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?va(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var Fn,ga=(function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,r,n,o){MSApp.execUnsafeLocalFunction(function(){return e(t,r,n,o)})}:e})(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(Fn=Fn||document.createElement("div"),Fn.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=Fn.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function Wr(e,t){if(t){var r=e.firstChild;if(r&&r===e.lastChild&&r.nodeType===3){r.nodeValue=t;return}}e.textContent=t}var Yr={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},xc=["Webkit","ms","Moz","O"];Object.keys(Yr).forEach(function(e){xc.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Yr[t]=Yr[e]})});function ya(e,t,r){return t==null||typeof t=="boolean"||t===""?"":r||typeof t!="number"||t===0||Yr.hasOwnProperty(e)&&Yr[e]?(""+t).trim():t+"px"}function _a(e,t){e=e.style;for(var r in t)if(t.hasOwnProperty(r)){var n=r.indexOf("--")===0,o=ya(r,t[r],n);r==="float"&&(r="cssFloat"),n?e.setProperty(r,o):e[r]=o}}var Ec=j({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function ll(e,t){if(t){if(Ec[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(a(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(a(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(a(61))}if(t.style!=null&&typeof t.style!="object")throw Error(a(62))}}function il(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var al=null;function sl(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var ul=null,Sr=null,wr=null;function Sa(e){if(e=mn(e)){if(typeof ul!="function")throw Error(a(280));var t=e.stateNode;t&&(t=no(t),ul(e.stateNode,e.type,t))}}function wa(e){Sr?wr?wr.push(e):wr=[e]:Sr=e}function xa(){if(Sr){var e=Sr,t=wr;if(wr=Sr=null,Sa(e),t)for(e=0;e<t.length;e++)Sa(t[e])}}function Ea(e,t){return e(t)}function ka(){}var cl=!1;function Ca(e,t,r){if(cl)return e(t,r);cl=!0;try{return Ea(e,t,r)}finally{cl=!1,(Sr!==null||wr!==null)&&(ka(),xa())}}function $r(e,t){var r=e.stateNode;if(r===null)return null;var n=no(r);if(n===null)return null;r=n[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(n=!n.disabled)||(e=e.type,n=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!n;break e;default:e=!1}if(e)return null;if(r&&typeof r!="function")throw Error(a(231,t,typeof r));return r}var fl=!1;if(S)try{var Xr={};Object.defineProperty(Xr,"passive",{get:function(){fl=!0}}),window.addEventListener("test",Xr,Xr),window.removeEventListener("test",Xr,Xr)}catch{fl=!1}function kc(e,t,r,n,o,l,s,c,d){var _=Array.prototype.slice.call(arguments,3);try{t.apply(r,_)}catch(R){this.onError(R)}}var Qr=!1,Mn=null,In=!1,dl=null,Cc={onError:function(e){Qr=!0,Mn=e}};function Tc(e,t,r,n,o,l,s,c,d){Qr=!1,Mn=null,kc.apply(Cc,arguments)}function Rc(e,t,r,n,o,l,s,c,d){if(Tc.apply(this,arguments),Qr){if(Qr){var _=Mn;Qr=!1,Mn=null}else throw Error(a(198));In||(In=!0,dl=_)}}function tr(e){var t=e,r=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,(t.flags&4098)!==0&&(r=t.return),e=t.return;while(e)}return t.tag===3?r:null}function Ta(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function Ra(e){if(tr(e)!==e)throw Error(a(188))}function Lc(e){var t=e.alternate;if(!t){if(t=tr(e),t===null)throw Error(a(188));return t!==e?null:e}for(var r=e,n=t;;){var o=r.return;if(o===null)break;var l=o.alternate;if(l===null){if(n=o.return,n!==null){r=n;continue}break}if(o.child===l.child){for(l=o.child;l;){if(l===r)return Ra(o),e;if(l===n)return Ra(o),t;l=l.sibling}throw Error(a(188))}if(r.return!==n.return)r=o,n=l;else{for(var s=!1,c=o.child;c;){if(c===r){s=!0,r=o,n=l;break}if(c===n){s=!0,n=o,r=l;break}c=c.sibling}if(!s){for(c=l.child;c;){if(c===r){s=!0,r=l,n=o;break}if(c===n){s=!0,n=l,r=o;break}c=c.sibling}if(!s)throw Error(a(189))}}if(r.alternate!==n)throw Error(a(190))}if(r.tag!==3)throw Error(a(188));return r.stateNode.current===r?e:t}function La(e){return e=Lc(e),e!==null?Aa(e):null}function Aa(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=Aa(e);if(t!==null)return t;e=e.sibling}return null}var Pa=i.unstable_scheduleCallback,Na=i.unstable_cancelCallback,Ac=i.unstable_shouldYield,Pc=i.unstable_requestPaint,Ee=i.unstable_now,Nc=i.unstable_getCurrentPriorityLevel,pl=i.unstable_ImmediatePriority,Da=i.unstable_UserBlockingPriority,Un=i.unstable_NormalPriority,Dc=i.unstable_LowPriority,Oa=i.unstable_IdlePriority,zn=null,St=null;function Oc(e){if(St&&typeof St.onCommitFiberRoot=="function")try{St.onCommitFiberRoot(zn,e,void 0,(e.current.flags&128)===128)}catch{}}var dt=Math.clz32?Math.clz32:Ic,Fc=Math.log,Mc=Math.LN2;function Ic(e){return e>>>=0,e===0?32:31-(Fc(e)/Mc|0)|0}var jn=64,bn=4194304;function qr(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Bn(e,t){var r=e.pendingLanes;if(r===0)return 0;var n=0,o=e.suspendedLanes,l=e.pingedLanes,s=r&268435455;if(s!==0){var c=s&~o;c!==0?n=qr(c):(l&=s,l!==0&&(n=qr(l)))}else s=r&~o,s!==0?n=qr(s):l!==0&&(n=qr(l));if(n===0)return 0;if(t!==0&&t!==n&&(t&o)===0&&(o=n&-n,l=t&-t,o>=l||o===16&&(l&4194240)!==0))return t;if((n&4)!==0&&(n|=r&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=n;0<t;)r=31-dt(t),o=1<<r,n|=e[r],t&=~o;return n}function Uc(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function zc(e,t){for(var r=e.suspendedLanes,n=e.pingedLanes,o=e.expirationTimes,l=e.pendingLanes;0<l;){var s=31-dt(l),c=1<<s,d=o[s];d===-1?((c&r)===0||(c&n)!==0)&&(o[s]=Uc(c,t)):d<=t&&(e.expiredLanes|=c),l&=~c}}function hl(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Fa(){var e=jn;return jn<<=1,(jn&4194240)===0&&(jn=64),e}function ml(e){for(var t=[],r=0;31>r;r++)t.push(e);return t}function Kr(e,t,r){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-dt(t),e[t]=r}function jc(e,t){var r=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var n=e.eventTimes;for(e=e.expirationTimes;0<r;){var o=31-dt(r),l=1<<o;t[o]=0,n[o]=-1,e[o]=-1,r&=~l}}function vl(e,t){var r=e.entangledLanes|=t;for(e=e.entanglements;r;){var n=31-dt(r),o=1<<n;o&t|e[n]&t&&(e[n]|=t),r&=~o}}var se=0;function Ma(e){return e&=-e,1<e?4<e?(e&268435455)!==0?16:536870912:4:1}var Ia,gl,Ua,za,ja,yl=!1,Hn=[],It=null,Ut=null,zt=null,Jr=new Map,Zr=new Map,jt=[],bc="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function ba(e,t){switch(e){case"focusin":case"focusout":It=null;break;case"dragenter":case"dragleave":Ut=null;break;case"mouseover":case"mouseout":zt=null;break;case"pointerover":case"pointerout":Jr.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Zr.delete(t.pointerId)}}function en(e,t,r,n,o,l){return e===null||e.nativeEvent!==l?(e={blockedOn:t,domEventName:r,eventSystemFlags:n,nativeEvent:l,targetContainers:[o]},t!==null&&(t=mn(t),t!==null&&gl(t)),e):(e.eventSystemFlags|=n,t=e.targetContainers,o!==null&&t.indexOf(o)===-1&&t.push(o),e)}function Bc(e,t,r,n,o){switch(t){case"focusin":return It=en(It,e,t,r,n,o),!0;case"dragenter":return Ut=en(Ut,e,t,r,n,o),!0;case"mouseover":return zt=en(zt,e,t,r,n,o),!0;case"pointerover":var l=o.pointerId;return Jr.set(l,en(Jr.get(l)||null,e,t,r,n,o)),!0;case"gotpointercapture":return l=o.pointerId,Zr.set(l,en(Zr.get(l)||null,e,t,r,n,o)),!0}return!1}function Ba(e){var t=rr(e.target);if(t!==null){var r=tr(t);if(r!==null){if(t=r.tag,t===13){if(t=Ta(r),t!==null){e.blockedOn=t,ja(e.priority,function(){Ua(r)});return}}else if(t===3&&r.stateNode.current.memoizedState.isDehydrated){e.blockedOn=r.tag===3?r.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Vn(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var r=Sl(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(r===null){r=e.nativeEvent;var n=new r.constructor(r.type,r);al=n,r.target.dispatchEvent(n),al=null}else return t=mn(r),t!==null&&gl(t),e.blockedOn=r,!1;t.shift()}return!0}function Ha(e,t,r){Vn(e)&&r.delete(t)}function Hc(){yl=!1,It!==null&&Vn(It)&&(It=null),Ut!==null&&Vn(Ut)&&(Ut=null),zt!==null&&Vn(zt)&&(zt=null),Jr.forEach(Ha),Zr.forEach(Ha)}function tn(e,t){e.blockedOn===t&&(e.blockedOn=null,yl||(yl=!0,i.unstable_scheduleCallback(i.unstable_NormalPriority,Hc)))}function rn(e){function t(o){return tn(o,e)}if(0<Hn.length){tn(Hn[0],e);for(var r=1;r<Hn.length;r++){var n=Hn[r];n.blockedOn===e&&(n.blockedOn=null)}}for(It!==null&&tn(It,e),Ut!==null&&tn(Ut,e),zt!==null&&tn(zt,e),Jr.forEach(t),Zr.forEach(t),r=0;r<jt.length;r++)n=jt[r],n.blockedOn===e&&(n.blockedOn=null);for(;0<jt.length&&(r=jt[0],r.blockedOn===null);)Ba(r),r.blockedOn===null&&jt.shift()}var xr=H.ReactCurrentBatchConfig,Gn=!0;function Vc(e,t,r,n){var o=se,l=xr.transition;xr.transition=null;try{se=1,_l(e,t,r,n)}finally{se=o,xr.transition=l}}function Gc(e,t,r,n){var o=se,l=xr.transition;xr.transition=null;try{se=4,_l(e,t,r,n)}finally{se=o,xr.transition=l}}function _l(e,t,r,n){if(Gn){var o=Sl(e,t,r,n);if(o===null)Ul(e,t,n,Wn,r),ba(e,n);else if(Bc(o,e,t,r,n))n.stopPropagation();else if(ba(e,n),t&4&&-1<bc.indexOf(e)){for(;o!==null;){var l=mn(o);if(l!==null&&Ia(l),l=Sl(e,t,r,n),l===null&&Ul(e,t,n,Wn,r),l===o)break;o=l}o!==null&&n.stopPropagation()}else Ul(e,t,n,null,r)}}var Wn=null;function Sl(e,t,r,n){if(Wn=null,e=sl(n),e=rr(e),e!==null)if(t=tr(e),t===null)e=null;else if(r=t.tag,r===13){if(e=Ta(t),e!==null)return e;e=null}else if(r===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Wn=e,null}function Va(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Nc()){case pl:return 1;case Da:return 4;case Un:case Dc:return 16;case Oa:return 536870912;default:return 16}default:return 16}}var bt=null,wl=null,Yn=null;function Ga(){if(Yn)return Yn;var e,t=wl,r=t.length,n,o="value"in bt?bt.value:bt.textContent,l=o.length;for(e=0;e<r&&t[e]===o[e];e++);var s=r-e;for(n=1;n<=s&&t[r-n]===o[l-n];n++);return Yn=o.slice(e,1<n?1-n:void 0)}function $n(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function Xn(){return!0}function Wa(){return!1}function rt(e){function t(r,n,o,l,s){this._reactName=r,this._targetInst=o,this.type=n,this.nativeEvent=l,this.target=s,this.currentTarget=null;for(var c in e)e.hasOwnProperty(c)&&(r=e[c],this[c]=r?r(l):l[c]);return this.isDefaultPrevented=(l.defaultPrevented!=null?l.defaultPrevented:l.returnValue===!1)?Xn:Wa,this.isPropagationStopped=Wa,this}return j(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var r=this.nativeEvent;r&&(r.preventDefault?r.preventDefault():typeof r.returnValue!="unknown"&&(r.returnValue=!1),this.isDefaultPrevented=Xn)},stopPropagation:function(){var r=this.nativeEvent;r&&(r.stopPropagation?r.stopPropagation():typeof r.cancelBubble!="unknown"&&(r.cancelBubble=!0),this.isPropagationStopped=Xn)},persist:function(){},isPersistent:Xn}),t}var Er={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},xl=rt(Er),nn=j({},Er,{view:0,detail:0}),Wc=rt(nn),El,kl,on,Qn=j({},nn,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Tl,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==on&&(on&&e.type==="mousemove"?(El=e.screenX-on.screenX,kl=e.screenY-on.screenY):kl=El=0,on=e),El)},movementY:function(e){return"movementY"in e?e.movementY:kl}}),Ya=rt(Qn),Yc=j({},Qn,{dataTransfer:0}),$c=rt(Yc),Xc=j({},nn,{relatedTarget:0}),Cl=rt(Xc),Qc=j({},Er,{animationName:0,elapsedTime:0,pseudoElement:0}),qc=rt(Qc),Kc=j({},Er,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Jc=rt(Kc),Zc=j({},Er,{data:0}),$a=rt(Zc),ef={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},tf={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},rf={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function nf(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=rf[e])?!!t[e]:!1}function Tl(){return nf}var of=j({},nn,{key:function(e){if(e.key){var t=ef[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=$n(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?tf[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Tl,charCode:function(e){return e.type==="keypress"?$n(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?$n(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),lf=rt(of),af=j({},Qn,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Xa=rt(af),sf=j({},nn,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Tl}),uf=rt(sf),cf=j({},Er,{propertyName:0,elapsedTime:0,pseudoElement:0}),ff=rt(cf),df=j({},Qn,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),pf=rt(df),hf=[9,13,27,32],Rl=S&&"CompositionEvent"in window,ln=null;S&&"documentMode"in document&&(ln=document.documentMode);var mf=S&&"TextEvent"in window&&!ln,Qa=S&&(!Rl||ln&&8<ln&&11>=ln),qa=" ",Ka=!1;function Ja(e,t){switch(e){case"keyup":return hf.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Za(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var kr=!1;function vf(e,t){switch(e){case"compositionend":return Za(t);case"keypress":return t.which!==32?null:(Ka=!0,qa);case"textInput":return e=t.data,e===qa&&Ka?null:e;default:return null}}function gf(e,t){if(kr)return e==="compositionend"||!Rl&&Ja(e,t)?(e=Ga(),Yn=wl=bt=null,kr=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Qa&&t.locale!=="ko"?null:t.data;default:return null}}var yf={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function es(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!yf[e.type]:t==="textarea"}function ts(e,t,r,n){wa(n),t=eo(t,"onChange"),0<t.length&&(r=new xl("onChange","change",null,r,n),e.push({event:r,listeners:t}))}var an=null,sn=null;function _f(e){_s(e,0)}function qn(e){var t=Ar(e);if(ua(t))return e}function Sf(e,t){if(e==="change")return t}var rs=!1;if(S){var Ll;if(S){var Al="oninput"in document;if(!Al){var ns=document.createElement("div");ns.setAttribute("oninput","return;"),Al=typeof ns.oninput=="function"}Ll=Al}else Ll=!1;rs=Ll&&(!document.documentMode||9<document.documentMode)}function os(){an&&(an.detachEvent("onpropertychange",ls),sn=an=null)}function ls(e){if(e.propertyName==="value"&&qn(sn)){var t=[];ts(t,sn,e,sl(e)),Ca(_f,t)}}function wf(e,t,r){e==="focusin"?(os(),an=t,sn=r,an.attachEvent("onpropertychange",ls)):e==="focusout"&&os()}function xf(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return qn(sn)}function Ef(e,t){if(e==="click")return qn(t)}function kf(e,t){if(e==="input"||e==="change")return qn(t)}function Cf(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var pt=typeof Object.is=="function"?Object.is:Cf;function un(e,t){if(pt(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var r=Object.keys(e),n=Object.keys(t);if(r.length!==n.length)return!1;for(n=0;n<r.length;n++){var o=r[n];if(!C.call(t,o)||!pt(e[o],t[o]))return!1}return!0}function is(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function as(e,t){var r=is(e);e=0;for(var n;r;){if(r.nodeType===3){if(n=e+r.textContent.length,e<=t&&n>=t)return{node:r,offset:t-e};e=n}e:{for(;r;){if(r.nextSibling){r=r.nextSibling;break e}r=r.parentNode}r=void 0}r=is(r)}}function ss(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?ss(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function us(){for(var e=window,t=On();t instanceof e.HTMLIFrameElement;){try{var r=typeof t.contentWindow.location.href=="string"}catch{r=!1}if(r)e=t.contentWindow;else break;t=On(e.document)}return t}function Pl(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function Tf(e){var t=us(),r=e.focusedElem,n=e.selectionRange;if(t!==r&&r&&r.ownerDocument&&ss(r.ownerDocument.documentElement,r)){if(n!==null&&Pl(r)){if(t=n.start,e=n.end,e===void 0&&(e=t),"selectionStart"in r)r.selectionStart=t,r.selectionEnd=Math.min(e,r.value.length);else if(e=(t=r.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var o=r.textContent.length,l=Math.min(n.start,o);n=n.end===void 0?l:Math.min(n.end,o),!e.extend&&l>n&&(o=n,n=l,l=o),o=as(r,l);var s=as(r,n);o&&s&&(e.rangeCount!==1||e.anchorNode!==o.node||e.anchorOffset!==o.offset||e.focusNode!==s.node||e.focusOffset!==s.offset)&&(t=t.createRange(),t.setStart(o.node,o.offset),e.removeAllRanges(),l>n?(e.addRange(t),e.extend(s.node,s.offset)):(t.setEnd(s.node,s.offset),e.addRange(t)))}}for(t=[],e=r;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof r.focus=="function"&&r.focus(),r=0;r<t.length;r++)e=t[r],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var Rf=S&&"documentMode"in document&&11>=document.documentMode,Cr=null,Nl=null,cn=null,Dl=!1;function cs(e,t,r){var n=r.window===r?r.document:r.nodeType===9?r:r.ownerDocument;Dl||Cr==null||Cr!==On(n)||(n=Cr,"selectionStart"in n&&Pl(n)?n={start:n.selectionStart,end:n.selectionEnd}:(n=(n.ownerDocument&&n.ownerDocument.defaultView||window).getSelection(),n={anchorNode:n.anchorNode,anchorOffset:n.anchorOffset,focusNode:n.focusNode,focusOffset:n.focusOffset}),cn&&un(cn,n)||(cn=n,n=eo(Nl,"onSelect"),0<n.length&&(t=new xl("onSelect","select",null,t,r),e.push({event:t,listeners:n}),t.target=Cr)))}function Kn(e,t){var r={};return r[e.toLowerCase()]=t.toLowerCase(),r["Webkit"+e]="webkit"+t,r["Moz"+e]="moz"+t,r}var Tr={animationend:Kn("Animation","AnimationEnd"),animationiteration:Kn("Animation","AnimationIteration"),animationstart:Kn("Animation","AnimationStart"),transitionend:Kn("Transition","TransitionEnd")},Ol={},fs={};S&&(fs=document.createElement("div").style,"AnimationEvent"in window||(delete Tr.animationend.animation,delete Tr.animationiteration.animation,delete Tr.animationstart.animation),"TransitionEvent"in window||delete Tr.transitionend.transition);function Jn(e){if(Ol[e])return Ol[e];if(!Tr[e])return e;var t=Tr[e],r;for(r in t)if(t.hasOwnProperty(r)&&r in fs)return Ol[e]=t[r];return e}var ds=Jn("animationend"),ps=Jn("animationiteration"),hs=Jn("animationstart"),ms=Jn("transitionend"),vs=new Map,gs="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Bt(e,t){vs.set(e,t),y(t,[e])}for(var Fl=0;Fl<gs.length;Fl++){var Ml=gs[Fl],Lf=Ml.toLowerCase(),Af=Ml[0].toUpperCase()+Ml.slice(1);Bt(Lf,"on"+Af)}Bt(ds,"onAnimationEnd"),Bt(ps,"onAnimationIteration"),Bt(hs,"onAnimationStart"),Bt("dblclick","onDoubleClick"),Bt("focusin","onFocus"),Bt("focusout","onBlur"),Bt(ms,"onTransitionEnd"),w("onMouseEnter",["mouseout","mouseover"]),w("onMouseLeave",["mouseout","mouseover"]),w("onPointerEnter",["pointerout","pointerover"]),w("onPointerLeave",["pointerout","pointerover"]),y("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),y("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),y("onBeforeInput",["compositionend","keypress","textInput","paste"]),y("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),y("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),y("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var fn="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Pf=new Set("cancel close invalid load scroll toggle".split(" ").concat(fn));function ys(e,t,r){var n=e.type||"unknown-event";e.currentTarget=r,Rc(n,t,void 0,e),e.currentTarget=null}function _s(e,t){t=(t&4)!==0;for(var r=0;r<e.length;r++){var n=e[r],o=n.event;n=n.listeners;e:{var l=void 0;if(t)for(var s=n.length-1;0<=s;s--){var c=n[s],d=c.instance,_=c.currentTarget;if(c=c.listener,d!==l&&o.isPropagationStopped())break e;ys(o,c,_),l=d}else for(s=0;s<n.length;s++){if(c=n[s],d=c.instance,_=c.currentTarget,c=c.listener,d!==l&&o.isPropagationStopped())break e;ys(o,c,_),l=d}}}if(In)throw e=dl,In=!1,dl=null,e}function me(e,t){var r=t[Vl];r===void 0&&(r=t[Vl]=new Set);var n=e+"__bubble";r.has(n)||(Ss(t,e,2,!1),r.add(n))}function Il(e,t,r){var n=0;t&&(n|=4),Ss(r,e,n,t)}var Zn="_reactListening"+Math.random().toString(36).slice(2);function dn(e){if(!e[Zn]){e[Zn]=!0,u.forEach(function(r){r!=="selectionchange"&&(Pf.has(r)||Il(r,!1,e),Il(r,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[Zn]||(t[Zn]=!0,Il("selectionchange",!1,t))}}function Ss(e,t,r,n){switch(Va(t)){case 1:var o=Vc;break;case 4:o=Gc;break;default:o=_l}r=o.bind(null,t,r,e),o=void 0,!fl||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(o=!0),n?o!==void 0?e.addEventListener(t,r,{capture:!0,passive:o}):e.addEventListener(t,r,!0):o!==void 0?e.addEventListener(t,r,{passive:o}):e.addEventListener(t,r,!1)}function Ul(e,t,r,n,o){var l=n;if((t&1)===0&&(t&2)===0&&n!==null)e:for(;;){if(n===null)return;var s=n.tag;if(s===3||s===4){var c=n.stateNode.containerInfo;if(c===o||c.nodeType===8&&c.parentNode===o)break;if(s===4)for(s=n.return;s!==null;){var d=s.tag;if((d===3||d===4)&&(d=s.stateNode.containerInfo,d===o||d.nodeType===8&&d.parentNode===o))return;s=s.return}for(;c!==null;){if(s=rr(c),s===null)return;if(d=s.tag,d===5||d===6){n=l=s;continue e}c=c.parentNode}}n=n.return}Ca(function(){var _=l,R=sl(r),L=[];e:{var k=vs.get(e);if(k!==void 0){var U=xl,V=e;switch(e){case"keypress":if($n(r)===0)break e;case"keydown":case"keyup":U=lf;break;case"focusin":V="focus",U=Cl;break;case"focusout":V="blur",U=Cl;break;case"beforeblur":case"afterblur":U=Cl;break;case"click":if(r.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":U=Ya;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":U=$c;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":U=uf;break;case ds:case ps:case hs:U=qc;break;case ms:U=ff;break;case"scroll":U=Wc;break;case"wheel":U=pf;break;case"copy":case"cut":case"paste":U=Jc;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":U=Xa}var G=(t&4)!==0,ke=!G&&e==="scroll",v=G?k!==null?k+"Capture":null:k;G=[];for(var p=_,g;p!==null;){g=p;var P=g.stateNode;if(g.tag===5&&P!==null&&(g=P,v!==null&&(P=$r(p,v),P!=null&&G.push(pn(p,P,g)))),ke)break;p=p.return}0<G.length&&(k=new U(k,V,null,r,R),L.push({event:k,listeners:G}))}}if((t&7)===0){e:{if(k=e==="mouseover"||e==="pointerover",U=e==="mouseout"||e==="pointerout",k&&r!==al&&(V=r.relatedTarget||r.fromElement)&&(rr(V)||V[Rt]))break e;if((U||k)&&(k=R.window===R?R:(k=R.ownerDocument)?k.defaultView||k.parentWindow:window,U?(V=r.relatedTarget||r.toElement,U=_,V=V?rr(V):null,V!==null&&(ke=tr(V),V!==ke||V.tag!==5&&V.tag!==6)&&(V=null)):(U=null,V=_),U!==V)){if(G=Ya,P="onMouseLeave",v="onMouseEnter",p="mouse",(e==="pointerout"||e==="pointerover")&&(G=Xa,P="onPointerLeave",v="onPointerEnter",p="pointer"),ke=U==null?k:Ar(U),g=V==null?k:Ar(V),k=new G(P,p+"leave",U,r,R),k.target=ke,k.relatedTarget=g,P=null,rr(R)===_&&(G=new G(v,p+"enter",V,r,R),G.target=g,G.relatedTarget=ke,P=G),ke=P,U&&V)t:{for(G=U,v=V,p=0,g=G;g;g=Rr(g))p++;for(g=0,P=v;P;P=Rr(P))g++;for(;0<p-g;)G=Rr(G),p--;for(;0<g-p;)v=Rr(v),g--;for(;p--;){if(G===v||v!==null&&G===v.alternate)break t;G=Rr(G),v=Rr(v)}G=null}else G=null;U!==null&&ws(L,k,U,G,!1),V!==null&&ke!==null&&ws(L,ke,V,G,!0)}}e:{if(k=_?Ar(_):window,U=k.nodeName&&k.nodeName.toLowerCase(),U==="select"||U==="input"&&k.type==="file")var W=Sf;else if(es(k))if(rs)W=kf;else{W=xf;var $=wf}else(U=k.nodeName)&&U.toLowerCase()==="input"&&(k.type==="checkbox"||k.type==="radio")&&(W=Ef);if(W&&(W=W(e,_))){ts(L,W,r,R);break e}$&&$(e,k,_),e==="focusout"&&($=k._wrapperState)&&$.controlled&&k.type==="number"&&rl(k,"number",k.value)}switch($=_?Ar(_):window,e){case"focusin":(es($)||$.contentEditable==="true")&&(Cr=$,Nl=_,cn=null);break;case"focusout":cn=Nl=Cr=null;break;case"mousedown":Dl=!0;break;case"contextmenu":case"mouseup":case"dragend":Dl=!1,cs(L,r,R);break;case"selectionchange":if(Rf)break;case"keydown":case"keyup":cs(L,r,R)}var X;if(Rl)e:{switch(e){case"compositionstart":var Q="onCompositionStart";break e;case"compositionend":Q="onCompositionEnd";break e;case"compositionupdate":Q="onCompositionUpdate";break e}Q=void 0}else kr?Ja(e,r)&&(Q="onCompositionEnd"):e==="keydown"&&r.keyCode===229&&(Q="onCompositionStart");Q&&(Qa&&r.locale!=="ko"&&(kr||Q!=="onCompositionStart"?Q==="onCompositionEnd"&&kr&&(X=Ga()):(bt=R,wl="value"in bt?bt.value:bt.textContent,kr=!0)),$=eo(_,Q),0<$.length&&(Q=new $a(Q,e,null,r,R),L.push({event:Q,listeners:$}),X?Q.data=X:(X=Za(r),X!==null&&(Q.data=X)))),(X=mf?vf(e,r):gf(e,r))&&(_=eo(_,"onBeforeInput"),0<_.length&&(R=new $a("onBeforeInput","beforeinput",null,r,R),L.push({event:R,listeners:_}),R.data=X))}_s(L,t)})}function pn(e,t,r){return{instance:e,listener:t,currentTarget:r}}function eo(e,t){for(var r=t+"Capture",n=[];e!==null;){var o=e,l=o.stateNode;o.tag===5&&l!==null&&(o=l,l=$r(e,r),l!=null&&n.unshift(pn(e,l,o)),l=$r(e,t),l!=null&&n.push(pn(e,l,o))),e=e.return}return n}function Rr(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function ws(e,t,r,n,o){for(var l=t._reactName,s=[];r!==null&&r!==n;){var c=r,d=c.alternate,_=c.stateNode;if(d!==null&&d===n)break;c.tag===5&&_!==null&&(c=_,o?(d=$r(r,l),d!=null&&s.unshift(pn(r,d,c))):o||(d=$r(r,l),d!=null&&s.push(pn(r,d,c)))),r=r.return}s.length!==0&&e.push({event:t,listeners:s})}var Nf=/\r\n?/g,Df=/\u0000|\uFFFD/g;function xs(e){return(typeof e=="string"?e:""+e).replace(Nf,`
`).replace(Df,"")}function to(e,t,r){if(t=xs(t),xs(e)!==t&&r)throw Error(a(425))}function ro(){}var zl=null,jl=null;function bl(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Bl=typeof setTimeout=="function"?setTimeout:void 0,Of=typeof clearTimeout=="function"?clearTimeout:void 0,Es=typeof Promise=="function"?Promise:void 0,Ff=typeof queueMicrotask=="function"?queueMicrotask:typeof Es<"u"?function(e){return Es.resolve(null).then(e).catch(Mf)}:Bl;function Mf(e){setTimeout(function(){throw e})}function Hl(e,t){var r=t,n=0;do{var o=r.nextSibling;if(e.removeChild(r),o&&o.nodeType===8)if(r=o.data,r==="/$"){if(n===0){e.removeChild(o),rn(t);return}n--}else r!=="$"&&r!=="$?"&&r!=="$!"||n++;r=o}while(r);rn(t)}function Ht(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function ks(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="$"||r==="$!"||r==="$?"){if(t===0)return e;t--}else r==="/$"&&t++}e=e.previousSibling}return null}var Lr=Math.random().toString(36).slice(2),wt="__reactFiber$"+Lr,hn="__reactProps$"+Lr,Rt="__reactContainer$"+Lr,Vl="__reactEvents$"+Lr,If="__reactListeners$"+Lr,Uf="__reactHandles$"+Lr;function rr(e){var t=e[wt];if(t)return t;for(var r=e.parentNode;r;){if(t=r[Rt]||r[wt]){if(r=t.alternate,t.child!==null||r!==null&&r.child!==null)for(e=ks(e);e!==null;){if(r=e[wt])return r;e=ks(e)}return t}e=r,r=e.parentNode}return null}function mn(e){return e=e[wt]||e[Rt],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function Ar(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(a(33))}function no(e){return e[hn]||null}var Gl=[],Pr=-1;function Vt(e){return{current:e}}function ve(e){0>Pr||(e.current=Gl[Pr],Gl[Pr]=null,Pr--)}function fe(e,t){Pr++,Gl[Pr]=e.current,e.current=t}var Gt={},Ue=Vt(Gt),Ge=Vt(!1),nr=Gt;function Nr(e,t){var r=e.type.contextTypes;if(!r)return Gt;var n=e.stateNode;if(n&&n.__reactInternalMemoizedUnmaskedChildContext===t)return n.__reactInternalMemoizedMaskedChildContext;var o={},l;for(l in r)o[l]=t[l];return n&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=o),o}function We(e){return e=e.childContextTypes,e!=null}function oo(){ve(Ge),ve(Ue)}function Cs(e,t,r){if(Ue.current!==Gt)throw Error(a(168));fe(Ue,t),fe(Ge,r)}function Ts(e,t,r){var n=e.stateNode;if(t=t.childContextTypes,typeof n.getChildContext!="function")return r;n=n.getChildContext();for(var o in n)if(!(o in t))throw Error(a(108,ce(e)||"Unknown",o));return j({},r,n)}function lo(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||Gt,nr=Ue.current,fe(Ue,e),fe(Ge,Ge.current),!0}function Rs(e,t,r){var n=e.stateNode;if(!n)throw Error(a(169));r?(e=Ts(e,t,nr),n.__reactInternalMemoizedMergedChildContext=e,ve(Ge),ve(Ue),fe(Ue,e)):ve(Ge),fe(Ge,r)}var Lt=null,io=!1,Wl=!1;function Ls(e){Lt===null?Lt=[e]:Lt.push(e)}function zf(e){io=!0,Ls(e)}function Wt(){if(!Wl&&Lt!==null){Wl=!0;var e=0,t=se;try{var r=Lt;for(se=1;e<r.length;e++){var n=r[e];do n=n(!0);while(n!==null)}Lt=null,io=!1}catch(o){throw Lt!==null&&(Lt=Lt.slice(e+1)),Pa(pl,Wt),o}finally{se=t,Wl=!1}}return null}var Dr=[],Or=0,ao=null,so=0,it=[],at=0,or=null,At=1,Pt="";function lr(e,t){Dr[Or++]=so,Dr[Or++]=ao,ao=e,so=t}function As(e,t,r){it[at++]=At,it[at++]=Pt,it[at++]=or,or=e;var n=At;e=Pt;var o=32-dt(n)-1;n&=~(1<<o),r+=1;var l=32-dt(t)+o;if(30<l){var s=o-o%5;l=(n&(1<<s)-1).toString(32),n>>=s,o-=s,At=1<<32-dt(t)+o|r<<o|n,Pt=l+e}else At=1<<l|r<<o|n,Pt=e}function Yl(e){e.return!==null&&(lr(e,1),As(e,1,0))}function $l(e){for(;e===ao;)ao=Dr[--Or],Dr[Or]=null,so=Dr[--Or],Dr[Or]=null;for(;e===or;)or=it[--at],it[at]=null,Pt=it[--at],it[at]=null,At=it[--at],it[at]=null}var nt=null,ot=null,ye=!1,ht=null;function Ps(e,t){var r=ft(5,null,null,0);r.elementType="DELETED",r.stateNode=t,r.return=e,t=e.deletions,t===null?(e.deletions=[r],e.flags|=16):t.push(r)}function Ns(e,t){switch(e.tag){case 5:var r=e.type;return t=t.nodeType!==1||r.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,nt=e,ot=Ht(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,nt=e,ot=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(r=or!==null?{id:At,overflow:Pt}:null,e.memoizedState={dehydrated:t,treeContext:r,retryLane:1073741824},r=ft(18,null,null,0),r.stateNode=t,r.return=e,e.child=r,nt=e,ot=null,!0):!1;default:return!1}}function Xl(e){return(e.mode&1)!==0&&(e.flags&128)===0}function Ql(e){if(ye){var t=ot;if(t){var r=t;if(!Ns(e,t)){if(Xl(e))throw Error(a(418));t=Ht(r.nextSibling);var n=nt;t&&Ns(e,t)?Ps(n,r):(e.flags=e.flags&-4097|2,ye=!1,nt=e)}}else{if(Xl(e))throw Error(a(418));e.flags=e.flags&-4097|2,ye=!1,nt=e}}}function Ds(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;nt=e}function uo(e){if(e!==nt)return!1;if(!ye)return Ds(e),ye=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!bl(e.type,e.memoizedProps)),t&&(t=ot)){if(Xl(e))throw Os(),Error(a(418));for(;t;)Ps(e,t),t=Ht(t.nextSibling)}if(Ds(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(a(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="/$"){if(t===0){ot=Ht(e.nextSibling);break e}t--}else r!=="$"&&r!=="$!"&&r!=="$?"||t++}e=e.nextSibling}ot=null}}else ot=nt?Ht(e.stateNode.nextSibling):null;return!0}function Os(){for(var e=ot;e;)e=Ht(e.nextSibling)}function Fr(){ot=nt=null,ye=!1}function ql(e){ht===null?ht=[e]:ht.push(e)}var jf=H.ReactCurrentBatchConfig;function vn(e,t,r){if(e=r.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(r._owner){if(r=r._owner,r){if(r.tag!==1)throw Error(a(309));var n=r.stateNode}if(!n)throw Error(a(147,e));var o=n,l=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===l?t.ref:(t=function(s){var c=o.refs;s===null?delete c[l]:c[l]=s},t._stringRef=l,t)}if(typeof e!="string")throw Error(a(284));if(!r._owner)throw Error(a(290,e))}return e}function co(e,t){throw e=Object.prototype.toString.call(t),Error(a(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Fs(e){var t=e._init;return t(e._payload)}function Ms(e){function t(v,p){if(e){var g=v.deletions;g===null?(v.deletions=[p],v.flags|=16):g.push(p)}}function r(v,p){if(!e)return null;for(;p!==null;)t(v,p),p=p.sibling;return null}function n(v,p){for(v=new Map;p!==null;)p.key!==null?v.set(p.key,p):v.set(p.index,p),p=p.sibling;return v}function o(v,p){return v=Zt(v,p),v.index=0,v.sibling=null,v}function l(v,p,g){return v.index=g,e?(g=v.alternate,g!==null?(g=g.index,g<p?(v.flags|=2,p):g):(v.flags|=2,p)):(v.flags|=1048576,p)}function s(v){return e&&v.alternate===null&&(v.flags|=2),v}function c(v,p,g,P){return p===null||p.tag!==6?(p=Bi(g,v.mode,P),p.return=v,p):(p=o(p,g),p.return=v,p)}function d(v,p,g,P){var W=g.type;return W===pe?R(v,p,g.props.children,P,g.key):p!==null&&(p.elementType===W||typeof W=="object"&&W!==null&&W.$$typeof===Ie&&Fs(W)===p.type)?(P=o(p,g.props),P.ref=vn(v,p,g),P.return=v,P):(P=Mo(g.type,g.key,g.props,null,v.mode,P),P.ref=vn(v,p,g),P.return=v,P)}function _(v,p,g,P){return p===null||p.tag!==4||p.stateNode.containerInfo!==g.containerInfo||p.stateNode.implementation!==g.implementation?(p=Hi(g,v.mode,P),p.return=v,p):(p=o(p,g.children||[]),p.return=v,p)}function R(v,p,g,P,W){return p===null||p.tag!==7?(p=pr(g,v.mode,P,W),p.return=v,p):(p=o(p,g),p.return=v,p)}function L(v,p,g){if(typeof p=="string"&&p!==""||typeof p=="number")return p=Bi(""+p,v.mode,g),p.return=v,p;if(typeof p=="object"&&p!==null){switch(p.$$typeof){case de:return g=Mo(p.type,p.key,p.props,null,v.mode,g),g.ref=vn(v,null,p),g.return=v,g;case ue:return p=Hi(p,v.mode,g),p.return=v,p;case Ie:var P=p._init;return L(v,P(p._payload),g)}if(Gr(p)||Y(p))return p=pr(p,v.mode,g,null),p.return=v,p;co(v,p)}return null}function k(v,p,g,P){var W=p!==null?p.key:null;if(typeof g=="string"&&g!==""||typeof g=="number")return W!==null?null:c(v,p,""+g,P);if(typeof g=="object"&&g!==null){switch(g.$$typeof){case de:return g.key===W?d(v,p,g,P):null;case ue:return g.key===W?_(v,p,g,P):null;case Ie:return W=g._init,k(v,p,W(g._payload),P)}if(Gr(g)||Y(g))return W!==null?null:R(v,p,g,P,null);co(v,g)}return null}function U(v,p,g,P,W){if(typeof P=="string"&&P!==""||typeof P=="number")return v=v.get(g)||null,c(p,v,""+P,W);if(typeof P=="object"&&P!==null){switch(P.$$typeof){case de:return v=v.get(P.key===null?g:P.key)||null,d(p,v,P,W);case ue:return v=v.get(P.key===null?g:P.key)||null,_(p,v,P,W);case Ie:var $=P._init;return U(v,p,g,$(P._payload),W)}if(Gr(P)||Y(P))return v=v.get(g)||null,R(p,v,P,W,null);co(p,P)}return null}function V(v,p,g,P){for(var W=null,$=null,X=p,Q=p=0,De=null;X!==null&&Q<g.length;Q++){X.index>Q?(De=X,X=null):De=X.sibling;var ie=k(v,X,g[Q],P);if(ie===null){X===null&&(X=De);break}e&&X&&ie.alternate===null&&t(v,X),p=l(ie,p,Q),$===null?W=ie:$.sibling=ie,$=ie,X=De}if(Q===g.length)return r(v,X),ye&&lr(v,Q),W;if(X===null){for(;Q<g.length;Q++)X=L(v,g[Q],P),X!==null&&(p=l(X,p,Q),$===null?W=X:$.sibling=X,$=X);return ye&&lr(v,Q),W}for(X=n(v,X);Q<g.length;Q++)De=U(X,v,Q,g[Q],P),De!==null&&(e&&De.alternate!==null&&X.delete(De.key===null?Q:De.key),p=l(De,p,Q),$===null?W=De:$.sibling=De,$=De);return e&&X.forEach(function(er){return t(v,er)}),ye&&lr(v,Q),W}function G(v,p,g,P){var W=Y(g);if(typeof W!="function")throw Error(a(150));if(g=W.call(g),g==null)throw Error(a(151));for(var $=W=null,X=p,Q=p=0,De=null,ie=g.next();X!==null&&!ie.done;Q++,ie=g.next()){X.index>Q?(De=X,X=null):De=X.sibling;var er=k(v,X,ie.value,P);if(er===null){X===null&&(X=De);break}e&&X&&er.alternate===null&&t(v,X),p=l(er,p,Q),$===null?W=er:$.sibling=er,$=er,X=De}if(ie.done)return r(v,X),ye&&lr(v,Q),W;if(X===null){for(;!ie.done;Q++,ie=g.next())ie=L(v,ie.value,P),ie!==null&&(p=l(ie,p,Q),$===null?W=ie:$.sibling=ie,$=ie);return ye&&lr(v,Q),W}for(X=n(v,X);!ie.done;Q++,ie=g.next())ie=U(X,v,Q,ie.value,P),ie!==null&&(e&&ie.alternate!==null&&X.delete(ie.key===null?Q:ie.key),p=l(ie,p,Q),$===null?W=ie:$.sibling=ie,$=ie);return e&&X.forEach(function(yd){return t(v,yd)}),ye&&lr(v,Q),W}function ke(v,p,g,P){if(typeof g=="object"&&g!==null&&g.type===pe&&g.key===null&&(g=g.props.children),typeof g=="object"&&g!==null){switch(g.$$typeof){case de:e:{for(var W=g.key,$=p;$!==null;){if($.key===W){if(W=g.type,W===pe){if($.tag===7){r(v,$.sibling),p=o($,g.props.children),p.return=v,v=p;break e}}else if($.elementType===W||typeof W=="object"&&W!==null&&W.$$typeof===Ie&&Fs(W)===$.type){r(v,$.sibling),p=o($,g.props),p.ref=vn(v,$,g),p.return=v,v=p;break e}r(v,$);break}else t(v,$);$=$.sibling}g.type===pe?(p=pr(g.props.children,v.mode,P,g.key),p.return=v,v=p):(P=Mo(g.type,g.key,g.props,null,v.mode,P),P.ref=vn(v,p,g),P.return=v,v=P)}return s(v);case ue:e:{for($=g.key;p!==null;){if(p.key===$)if(p.tag===4&&p.stateNode.containerInfo===g.containerInfo&&p.stateNode.implementation===g.implementation){r(v,p.sibling),p=o(p,g.children||[]),p.return=v,v=p;break e}else{r(v,p);break}else t(v,p);p=p.sibling}p=Hi(g,v.mode,P),p.return=v,v=p}return s(v);case Ie:return $=g._init,ke(v,p,$(g._payload),P)}if(Gr(g))return V(v,p,g,P);if(Y(g))return G(v,p,g,P);co(v,g)}return typeof g=="string"&&g!==""||typeof g=="number"?(g=""+g,p!==null&&p.tag===6?(r(v,p.sibling),p=o(p,g),p.return=v,v=p):(r(v,p),p=Bi(g,v.mode,P),p.return=v,v=p),s(v)):r(v,p)}return ke}var Mr=Ms(!0),Is=Ms(!1),fo=Vt(null),po=null,Ir=null,Kl=null;function Jl(){Kl=Ir=po=null}function Zl(e){var t=fo.current;ve(fo),e._currentValue=t}function ei(e,t,r){for(;e!==null;){var n=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,n!==null&&(n.childLanes|=t)):n!==null&&(n.childLanes&t)!==t&&(n.childLanes|=t),e===r)break;e=e.return}}function Ur(e,t){po=e,Kl=Ir=null,e=e.dependencies,e!==null&&e.firstContext!==null&&((e.lanes&t)!==0&&(Ye=!0),e.firstContext=null)}function st(e){var t=e._currentValue;if(Kl!==e)if(e={context:e,memoizedValue:t,next:null},Ir===null){if(po===null)throw Error(a(308));Ir=e,po.dependencies={lanes:0,firstContext:e}}else Ir=Ir.next=e;return t}var ir=null;function ti(e){ir===null?ir=[e]:ir.push(e)}function Us(e,t,r,n){var o=t.interleaved;return o===null?(r.next=r,ti(t)):(r.next=o.next,o.next=r),t.interleaved=r,Nt(e,n)}function Nt(e,t){e.lanes|=t;var r=e.alternate;for(r!==null&&(r.lanes|=t),r=e,e=e.return;e!==null;)e.childLanes|=t,r=e.alternate,r!==null&&(r.childLanes|=t),r=e,e=e.return;return r.tag===3?r.stateNode:null}var Yt=!1;function ri(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function zs(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function Dt(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function $t(e,t,r){var n=e.updateQueue;if(n===null)return null;if(n=n.shared,(ne&2)!==0){var o=n.pending;return o===null?t.next=t:(t.next=o.next,o.next=t),n.pending=t,Nt(e,r)}return o=n.interleaved,o===null?(t.next=t,ti(n)):(t.next=o.next,o.next=t),n.interleaved=t,Nt(e,r)}function ho(e,t,r){if(t=t.updateQueue,t!==null&&(t=t.shared,(r&4194240)!==0)){var n=t.lanes;n&=e.pendingLanes,r|=n,t.lanes=r,vl(e,r)}}function js(e,t){var r=e.updateQueue,n=e.alternate;if(n!==null&&(n=n.updateQueue,r===n)){var o=null,l=null;if(r=r.firstBaseUpdate,r!==null){do{var s={eventTime:r.eventTime,lane:r.lane,tag:r.tag,payload:r.payload,callback:r.callback,next:null};l===null?o=l=s:l=l.next=s,r=r.next}while(r!==null);l===null?o=l=t:l=l.next=t}else o=l=t;r={baseState:n.baseState,firstBaseUpdate:o,lastBaseUpdate:l,shared:n.shared,effects:n.effects},e.updateQueue=r;return}e=r.lastBaseUpdate,e===null?r.firstBaseUpdate=t:e.next=t,r.lastBaseUpdate=t}function mo(e,t,r,n){var o=e.updateQueue;Yt=!1;var l=o.firstBaseUpdate,s=o.lastBaseUpdate,c=o.shared.pending;if(c!==null){o.shared.pending=null;var d=c,_=d.next;d.next=null,s===null?l=_:s.next=_,s=d;var R=e.alternate;R!==null&&(R=R.updateQueue,c=R.lastBaseUpdate,c!==s&&(c===null?R.firstBaseUpdate=_:c.next=_,R.lastBaseUpdate=d))}if(l!==null){var L=o.baseState;s=0,R=_=d=null,c=l;do{var k=c.lane,U=c.eventTime;if((n&k)===k){R!==null&&(R=R.next={eventTime:U,lane:0,tag:c.tag,payload:c.payload,callback:c.callback,next:null});e:{var V=e,G=c;switch(k=t,U=r,G.tag){case 1:if(V=G.payload,typeof V=="function"){L=V.call(U,L,k);break e}L=V;break e;case 3:V.flags=V.flags&-65537|128;case 0:if(V=G.payload,k=typeof V=="function"?V.call(U,L,k):V,k==null)break e;L=j({},L,k);break e;case 2:Yt=!0}}c.callback!==null&&c.lane!==0&&(e.flags|=64,k=o.effects,k===null?o.effects=[c]:k.push(c))}else U={eventTime:U,lane:k,tag:c.tag,payload:c.payload,callback:c.callback,next:null},R===null?(_=R=U,d=L):R=R.next=U,s|=k;if(c=c.next,c===null){if(c=o.shared.pending,c===null)break;k=c,c=k.next,k.next=null,o.lastBaseUpdate=k,o.shared.pending=null}}while(!0);if(R===null&&(d=L),o.baseState=d,o.firstBaseUpdate=_,o.lastBaseUpdate=R,t=o.shared.interleaved,t!==null){o=t;do s|=o.lane,o=o.next;while(o!==t)}else l===null&&(o.shared.lanes=0);ur|=s,e.lanes=s,e.memoizedState=L}}function bs(e,t,r){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var n=e[t],o=n.callback;if(o!==null){if(n.callback=null,n=r,typeof o!="function")throw Error(a(191,o));o.call(n)}}}var gn={},xt=Vt(gn),yn=Vt(gn),_n=Vt(gn);function ar(e){if(e===gn)throw Error(a(174));return e}function ni(e,t){switch(fe(_n,t),fe(yn,e),fe(xt,gn),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:ol(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=ol(t,e)}ve(xt),fe(xt,t)}function zr(){ve(xt),ve(yn),ve(_n)}function Bs(e){ar(_n.current);var t=ar(xt.current),r=ol(t,e.type);t!==r&&(fe(yn,e),fe(xt,r))}function oi(e){yn.current===e&&(ve(xt),ve(yn))}var _e=Vt(0);function vo(e){for(var t=e;t!==null;){if(t.tag===13){var r=t.memoizedState;if(r!==null&&(r=r.dehydrated,r===null||r.data==="$?"||r.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if((t.flags&128)!==0)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var li=[];function ii(){for(var e=0;e<li.length;e++)li[e]._workInProgressVersionPrimary=null;li.length=0}var go=H.ReactCurrentDispatcher,ai=H.ReactCurrentBatchConfig,sr=0,Se=null,Re=null,Pe=null,yo=!1,Sn=!1,wn=0,bf=0;function ze(){throw Error(a(321))}function si(e,t){if(t===null)return!1;for(var r=0;r<t.length&&r<e.length;r++)if(!pt(e[r],t[r]))return!1;return!0}function ui(e,t,r,n,o,l){if(sr=l,Se=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,go.current=e===null||e.memoizedState===null?Gf:Wf,e=r(n,o),Sn){l=0;do{if(Sn=!1,wn=0,25<=l)throw Error(a(301));l+=1,Pe=Re=null,t.updateQueue=null,go.current=Yf,e=r(n,o)}while(Sn)}if(go.current=wo,t=Re!==null&&Re.next!==null,sr=0,Pe=Re=Se=null,yo=!1,t)throw Error(a(300));return e}function ci(){var e=wn!==0;return wn=0,e}function Et(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Pe===null?Se.memoizedState=Pe=e:Pe=Pe.next=e,Pe}function ut(){if(Re===null){var e=Se.alternate;e=e!==null?e.memoizedState:null}else e=Re.next;var t=Pe===null?Se.memoizedState:Pe.next;if(t!==null)Pe=t,Re=e;else{if(e===null)throw Error(a(310));Re=e,e={memoizedState:Re.memoizedState,baseState:Re.baseState,baseQueue:Re.baseQueue,queue:Re.queue,next:null},Pe===null?Se.memoizedState=Pe=e:Pe=Pe.next=e}return Pe}function xn(e,t){return typeof t=="function"?t(e):t}function fi(e){var t=ut(),r=t.queue;if(r===null)throw Error(a(311));r.lastRenderedReducer=e;var n=Re,o=n.baseQueue,l=r.pending;if(l!==null){if(o!==null){var s=o.next;o.next=l.next,l.next=s}n.baseQueue=o=l,r.pending=null}if(o!==null){l=o.next,n=n.baseState;var c=s=null,d=null,_=l;do{var R=_.lane;if((sr&R)===R)d!==null&&(d=d.next={lane:0,action:_.action,hasEagerState:_.hasEagerState,eagerState:_.eagerState,next:null}),n=_.hasEagerState?_.eagerState:e(n,_.action);else{var L={lane:R,action:_.action,hasEagerState:_.hasEagerState,eagerState:_.eagerState,next:null};d===null?(c=d=L,s=n):d=d.next=L,Se.lanes|=R,ur|=R}_=_.next}while(_!==null&&_!==l);d===null?s=n:d.next=c,pt(n,t.memoizedState)||(Ye=!0),t.memoizedState=n,t.baseState=s,t.baseQueue=d,r.lastRenderedState=n}if(e=r.interleaved,e!==null){o=e;do l=o.lane,Se.lanes|=l,ur|=l,o=o.next;while(o!==e)}else o===null&&(r.lanes=0);return[t.memoizedState,r.dispatch]}function di(e){var t=ut(),r=t.queue;if(r===null)throw Error(a(311));r.lastRenderedReducer=e;var n=r.dispatch,o=r.pending,l=t.memoizedState;if(o!==null){r.pending=null;var s=o=o.next;do l=e(l,s.action),s=s.next;while(s!==o);pt(l,t.memoizedState)||(Ye=!0),t.memoizedState=l,t.baseQueue===null&&(t.baseState=l),r.lastRenderedState=l}return[l,n]}function Hs(){}function Vs(e,t){var r=Se,n=ut(),o=t(),l=!pt(n.memoizedState,o);if(l&&(n.memoizedState=o,Ye=!0),n=n.queue,pi(Ys.bind(null,r,n,e),[e]),n.getSnapshot!==t||l||Pe!==null&&Pe.memoizedState.tag&1){if(r.flags|=2048,En(9,Ws.bind(null,r,n,o,t),void 0,null),Ne===null)throw Error(a(349));(sr&30)!==0||Gs(r,t,o)}return o}function Gs(e,t,r){e.flags|=16384,e={getSnapshot:t,value:r},t=Se.updateQueue,t===null?(t={lastEffect:null,stores:null},Se.updateQueue=t,t.stores=[e]):(r=t.stores,r===null?t.stores=[e]:r.push(e))}function Ws(e,t,r,n){t.value=r,t.getSnapshot=n,$s(t)&&Xs(e)}function Ys(e,t,r){return r(function(){$s(t)&&Xs(e)})}function $s(e){var t=e.getSnapshot;e=e.value;try{var r=t();return!pt(e,r)}catch{return!0}}function Xs(e){var t=Nt(e,1);t!==null&&yt(t,e,1,-1)}function Qs(e){var t=Et();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:xn,lastRenderedState:e},t.queue=e,e=e.dispatch=Vf.bind(null,Se,e),[t.memoizedState,e]}function En(e,t,r,n){return e={tag:e,create:t,destroy:r,deps:n,next:null},t=Se.updateQueue,t===null?(t={lastEffect:null,stores:null},Se.updateQueue=t,t.lastEffect=e.next=e):(r=t.lastEffect,r===null?t.lastEffect=e.next=e:(n=r.next,r.next=e,e.next=n,t.lastEffect=e)),e}function qs(){return ut().memoizedState}function _o(e,t,r,n){var o=Et();Se.flags|=e,o.memoizedState=En(1|t,r,void 0,n===void 0?null:n)}function So(e,t,r,n){var o=ut();n=n===void 0?null:n;var l=void 0;if(Re!==null){var s=Re.memoizedState;if(l=s.destroy,n!==null&&si(n,s.deps)){o.memoizedState=En(t,r,l,n);return}}Se.flags|=e,o.memoizedState=En(1|t,r,l,n)}function Ks(e,t){return _o(8390656,8,e,t)}function pi(e,t){return So(2048,8,e,t)}function Js(e,t){return So(4,2,e,t)}function Zs(e,t){return So(4,4,e,t)}function eu(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function tu(e,t,r){return r=r!=null?r.concat([e]):null,So(4,4,eu.bind(null,t,e),r)}function hi(){}function ru(e,t){var r=ut();t=t===void 0?null:t;var n=r.memoizedState;return n!==null&&t!==null&&si(t,n[1])?n[0]:(r.memoizedState=[e,t],e)}function nu(e,t){var r=ut();t=t===void 0?null:t;var n=r.memoizedState;return n!==null&&t!==null&&si(t,n[1])?n[0]:(e=e(),r.memoizedState=[e,t],e)}function ou(e,t,r){return(sr&21)===0?(e.baseState&&(e.baseState=!1,Ye=!0),e.memoizedState=r):(pt(r,t)||(r=Fa(),Se.lanes|=r,ur|=r,e.baseState=!0),t)}function Bf(e,t){var r=se;se=r!==0&&4>r?r:4,e(!0);var n=ai.transition;ai.transition={};try{e(!1),t()}finally{se=r,ai.transition=n}}function lu(){return ut().memoizedState}function Hf(e,t,r){var n=Kt(e);if(r={lane:n,action:r,hasEagerState:!1,eagerState:null,next:null},iu(e))au(t,r);else if(r=Us(e,t,r,n),r!==null){var o=He();yt(r,e,n,o),su(r,t,n)}}function Vf(e,t,r){var n=Kt(e),o={lane:n,action:r,hasEagerState:!1,eagerState:null,next:null};if(iu(e))au(t,o);else{var l=e.alternate;if(e.lanes===0&&(l===null||l.lanes===0)&&(l=t.lastRenderedReducer,l!==null))try{var s=t.lastRenderedState,c=l(s,r);if(o.hasEagerState=!0,o.eagerState=c,pt(c,s)){var d=t.interleaved;d===null?(o.next=o,ti(t)):(o.next=d.next,d.next=o),t.interleaved=o;return}}catch{}finally{}r=Us(e,t,o,n),r!==null&&(o=He(),yt(r,e,n,o),su(r,t,n))}}function iu(e){var t=e.alternate;return e===Se||t!==null&&t===Se}function au(e,t){Sn=yo=!0;var r=e.pending;r===null?t.next=t:(t.next=r.next,r.next=t),e.pending=t}function su(e,t,r){if((r&4194240)!==0){var n=t.lanes;n&=e.pendingLanes,r|=n,t.lanes=r,vl(e,r)}}var wo={readContext:st,useCallback:ze,useContext:ze,useEffect:ze,useImperativeHandle:ze,useInsertionEffect:ze,useLayoutEffect:ze,useMemo:ze,useReducer:ze,useRef:ze,useState:ze,useDebugValue:ze,useDeferredValue:ze,useTransition:ze,useMutableSource:ze,useSyncExternalStore:ze,useId:ze,unstable_isNewReconciler:!1},Gf={readContext:st,useCallback:function(e,t){return Et().memoizedState=[e,t===void 0?null:t],e},useContext:st,useEffect:Ks,useImperativeHandle:function(e,t,r){return r=r!=null?r.concat([e]):null,_o(4194308,4,eu.bind(null,t,e),r)},useLayoutEffect:function(e,t){return _o(4194308,4,e,t)},useInsertionEffect:function(e,t){return _o(4,2,e,t)},useMemo:function(e,t){var r=Et();return t=t===void 0?null:t,e=e(),r.memoizedState=[e,t],e},useReducer:function(e,t,r){var n=Et();return t=r!==void 0?r(t):t,n.memoizedState=n.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},n.queue=e,e=e.dispatch=Hf.bind(null,Se,e),[n.memoizedState,e]},useRef:function(e){var t=Et();return e={current:e},t.memoizedState=e},useState:Qs,useDebugValue:hi,useDeferredValue:function(e){return Et().memoizedState=e},useTransition:function(){var e=Qs(!1),t=e[0];return e=Bf.bind(null,e[1]),Et().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,r){var n=Se,o=Et();if(ye){if(r===void 0)throw Error(a(407));r=r()}else{if(r=t(),Ne===null)throw Error(a(349));(sr&30)!==0||Gs(n,t,r)}o.memoizedState=r;var l={value:r,getSnapshot:t};return o.queue=l,Ks(Ys.bind(null,n,l,e),[e]),n.flags|=2048,En(9,Ws.bind(null,n,l,r,t),void 0,null),r},useId:function(){var e=Et(),t=Ne.identifierPrefix;if(ye){var r=Pt,n=At;r=(n&~(1<<32-dt(n)-1)).toString(32)+r,t=":"+t+"R"+r,r=wn++,0<r&&(t+="H"+r.toString(32)),t+=":"}else r=bf++,t=":"+t+"r"+r.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},Wf={readContext:st,useCallback:ru,useContext:st,useEffect:pi,useImperativeHandle:tu,useInsertionEffect:Js,useLayoutEffect:Zs,useMemo:nu,useReducer:fi,useRef:qs,useState:function(){return fi(xn)},useDebugValue:hi,useDeferredValue:function(e){var t=ut();return ou(t,Re.memoizedState,e)},useTransition:function(){var e=fi(xn)[0],t=ut().memoizedState;return[e,t]},useMutableSource:Hs,useSyncExternalStore:Vs,useId:lu,unstable_isNewReconciler:!1},Yf={readContext:st,useCallback:ru,useContext:st,useEffect:pi,useImperativeHandle:tu,useInsertionEffect:Js,useLayoutEffect:Zs,useMemo:nu,useReducer:di,useRef:qs,useState:function(){return di(xn)},useDebugValue:hi,useDeferredValue:function(e){var t=ut();return Re===null?t.memoizedState=e:ou(t,Re.memoizedState,e)},useTransition:function(){var e=di(xn)[0],t=ut().memoizedState;return[e,t]},useMutableSource:Hs,useSyncExternalStore:Vs,useId:lu,unstable_isNewReconciler:!1};function mt(e,t){if(e&&e.defaultProps){t=j({},t),e=e.defaultProps;for(var r in e)t[r]===void 0&&(t[r]=e[r]);return t}return t}function mi(e,t,r,n){t=e.memoizedState,r=r(n,t),r=r==null?t:j({},t,r),e.memoizedState=r,e.lanes===0&&(e.updateQueue.baseState=r)}var xo={isMounted:function(e){return(e=e._reactInternals)?tr(e)===e:!1},enqueueSetState:function(e,t,r){e=e._reactInternals;var n=He(),o=Kt(e),l=Dt(n,o);l.payload=t,r!=null&&(l.callback=r),t=$t(e,l,o),t!==null&&(yt(t,e,o,n),ho(t,e,o))},enqueueReplaceState:function(e,t,r){e=e._reactInternals;var n=He(),o=Kt(e),l=Dt(n,o);l.tag=1,l.payload=t,r!=null&&(l.callback=r),t=$t(e,l,o),t!==null&&(yt(t,e,o,n),ho(t,e,o))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var r=He(),n=Kt(e),o=Dt(r,n);o.tag=2,t!=null&&(o.callback=t),t=$t(e,o,n),t!==null&&(yt(t,e,n,r),ho(t,e,n))}};function uu(e,t,r,n,o,l,s){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(n,l,s):t.prototype&&t.prototype.isPureReactComponent?!un(r,n)||!un(o,l):!0}function cu(e,t,r){var n=!1,o=Gt,l=t.contextType;return typeof l=="object"&&l!==null?l=st(l):(o=We(t)?nr:Ue.current,n=t.contextTypes,l=(n=n!=null)?Nr(e,o):Gt),t=new t(r,l),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=xo,e.stateNode=t,t._reactInternals=e,n&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=o,e.__reactInternalMemoizedMaskedChildContext=l),t}function fu(e,t,r,n){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(r,n),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(r,n),t.state!==e&&xo.enqueueReplaceState(t,t.state,null)}function vi(e,t,r,n){var o=e.stateNode;o.props=r,o.state=e.memoizedState,o.refs={},ri(e);var l=t.contextType;typeof l=="object"&&l!==null?o.context=st(l):(l=We(t)?nr:Ue.current,o.context=Nr(e,l)),o.state=e.memoizedState,l=t.getDerivedStateFromProps,typeof l=="function"&&(mi(e,t,l,r),o.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof o.getSnapshotBeforeUpdate=="function"||typeof o.UNSAFE_componentWillMount!="function"&&typeof o.componentWillMount!="function"||(t=o.state,typeof o.componentWillMount=="function"&&o.componentWillMount(),typeof o.UNSAFE_componentWillMount=="function"&&o.UNSAFE_componentWillMount(),t!==o.state&&xo.enqueueReplaceState(o,o.state,null),mo(e,r,o,n),o.state=e.memoizedState),typeof o.componentDidMount=="function"&&(e.flags|=4194308)}function jr(e,t){try{var r="",n=t;do r+=oe(n),n=n.return;while(n);var o=r}catch(l){o=`
Error generating stack: `+l.message+`
`+l.stack}return{value:e,source:t,stack:o,digest:null}}function gi(e,t,r){return{value:e,source:null,stack:r??null,digest:t??null}}function yi(e,t){try{console.error(t.value)}catch(r){setTimeout(function(){throw r})}}var $f=typeof WeakMap=="function"?WeakMap:Map;function du(e,t,r){r=Dt(-1,r),r.tag=3,r.payload={element:null};var n=t.value;return r.callback=function(){Ao||(Ao=!0,Oi=n),yi(e,t)},r}function pu(e,t,r){r=Dt(-1,r),r.tag=3;var n=e.type.getDerivedStateFromError;if(typeof n=="function"){var o=t.value;r.payload=function(){return n(o)},r.callback=function(){yi(e,t)}}var l=e.stateNode;return l!==null&&typeof l.componentDidCatch=="function"&&(r.callback=function(){yi(e,t),typeof n!="function"&&(Qt===null?Qt=new Set([this]):Qt.add(this));var s=t.stack;this.componentDidCatch(t.value,{componentStack:s!==null?s:""})}),r}function hu(e,t,r){var n=e.pingCache;if(n===null){n=e.pingCache=new $f;var o=new Set;n.set(t,o)}else o=n.get(t),o===void 0&&(o=new Set,n.set(t,o));o.has(r)||(o.add(r),e=ad.bind(null,e,t,r),t.then(e,e))}function mu(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function vu(e,t,r,n,o){return(e.mode&1)===0?(e===t?e.flags|=65536:(e.flags|=128,r.flags|=131072,r.flags&=-52805,r.tag===1&&(r.alternate===null?r.tag=17:(t=Dt(-1,1),t.tag=2,$t(r,t,1))),r.lanes|=1),e):(e.flags|=65536,e.lanes=o,e)}var Xf=H.ReactCurrentOwner,Ye=!1;function Be(e,t,r,n){t.child=e===null?Is(t,null,r,n):Mr(t,e.child,r,n)}function gu(e,t,r,n,o){r=r.render;var l=t.ref;return Ur(t,o),n=ui(e,t,r,n,l,o),r=ci(),e!==null&&!Ye?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~o,Ot(e,t,o)):(ye&&r&&Yl(t),t.flags|=1,Be(e,t,n,o),t.child)}function yu(e,t,r,n,o){if(e===null){var l=r.type;return typeof l=="function"&&!bi(l)&&l.defaultProps===void 0&&r.compare===null&&r.defaultProps===void 0?(t.tag=15,t.type=l,_u(e,t,l,n,o)):(e=Mo(r.type,null,n,t,t.mode,o),e.ref=t.ref,e.return=t,t.child=e)}if(l=e.child,(e.lanes&o)===0){var s=l.memoizedProps;if(r=r.compare,r=r!==null?r:un,r(s,n)&&e.ref===t.ref)return Ot(e,t,o)}return t.flags|=1,e=Zt(l,n),e.ref=t.ref,e.return=t,t.child=e}function _u(e,t,r,n,o){if(e!==null){var l=e.memoizedProps;if(un(l,n)&&e.ref===t.ref)if(Ye=!1,t.pendingProps=n=l,(e.lanes&o)!==0)(e.flags&131072)!==0&&(Ye=!0);else return t.lanes=e.lanes,Ot(e,t,o)}return _i(e,t,r,n,o)}function Su(e,t,r){var n=t.pendingProps,o=n.children,l=e!==null?e.memoizedState:null;if(n.mode==="hidden")if((t.mode&1)===0)t.memoizedState={baseLanes:0,cachePool:null,transitions:null},fe(Br,lt),lt|=r;else{if((r&1073741824)===0)return e=l!==null?l.baseLanes|r:r,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,fe(Br,lt),lt|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},n=l!==null?l.baseLanes:r,fe(Br,lt),lt|=n}else l!==null?(n=l.baseLanes|r,t.memoizedState=null):n=r,fe(Br,lt),lt|=n;return Be(e,t,o,r),t.child}function wu(e,t){var r=t.ref;(e===null&&r!==null||e!==null&&e.ref!==r)&&(t.flags|=512,t.flags|=2097152)}function _i(e,t,r,n,o){var l=We(r)?nr:Ue.current;return l=Nr(t,l),Ur(t,o),r=ui(e,t,r,n,l,o),n=ci(),e!==null&&!Ye?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~o,Ot(e,t,o)):(ye&&n&&Yl(t),t.flags|=1,Be(e,t,r,o),t.child)}function xu(e,t,r,n,o){if(We(r)){var l=!0;lo(t)}else l=!1;if(Ur(t,o),t.stateNode===null)ko(e,t),cu(t,r,n),vi(t,r,n,o),n=!0;else if(e===null){var s=t.stateNode,c=t.memoizedProps;s.props=c;var d=s.context,_=r.contextType;typeof _=="object"&&_!==null?_=st(_):(_=We(r)?nr:Ue.current,_=Nr(t,_));var R=r.getDerivedStateFromProps,L=typeof R=="function"||typeof s.getSnapshotBeforeUpdate=="function";L||typeof s.UNSAFE_componentWillReceiveProps!="function"&&typeof s.componentWillReceiveProps!="function"||(c!==n||d!==_)&&fu(t,s,n,_),Yt=!1;var k=t.memoizedState;s.state=k,mo(t,n,s,o),d=t.memoizedState,c!==n||k!==d||Ge.current||Yt?(typeof R=="function"&&(mi(t,r,R,n),d=t.memoizedState),(c=Yt||uu(t,r,c,n,k,d,_))?(L||typeof s.UNSAFE_componentWillMount!="function"&&typeof s.componentWillMount!="function"||(typeof s.componentWillMount=="function"&&s.componentWillMount(),typeof s.UNSAFE_componentWillMount=="function"&&s.UNSAFE_componentWillMount()),typeof s.componentDidMount=="function"&&(t.flags|=4194308)):(typeof s.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=n,t.memoizedState=d),s.props=n,s.state=d,s.context=_,n=c):(typeof s.componentDidMount=="function"&&(t.flags|=4194308),n=!1)}else{s=t.stateNode,zs(e,t),c=t.memoizedProps,_=t.type===t.elementType?c:mt(t.type,c),s.props=_,L=t.pendingProps,k=s.context,d=r.contextType,typeof d=="object"&&d!==null?d=st(d):(d=We(r)?nr:Ue.current,d=Nr(t,d));var U=r.getDerivedStateFromProps;(R=typeof U=="function"||typeof s.getSnapshotBeforeUpdate=="function")||typeof s.UNSAFE_componentWillReceiveProps!="function"&&typeof s.componentWillReceiveProps!="function"||(c!==L||k!==d)&&fu(t,s,n,d),Yt=!1,k=t.memoizedState,s.state=k,mo(t,n,s,o);var V=t.memoizedState;c!==L||k!==V||Ge.current||Yt?(typeof U=="function"&&(mi(t,r,U,n),V=t.memoizedState),(_=Yt||uu(t,r,_,n,k,V,d)||!1)?(R||typeof s.UNSAFE_componentWillUpdate!="function"&&typeof s.componentWillUpdate!="function"||(typeof s.componentWillUpdate=="function"&&s.componentWillUpdate(n,V,d),typeof s.UNSAFE_componentWillUpdate=="function"&&s.UNSAFE_componentWillUpdate(n,V,d)),typeof s.componentDidUpdate=="function"&&(t.flags|=4),typeof s.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof s.componentDidUpdate!="function"||c===e.memoizedProps&&k===e.memoizedState||(t.flags|=4),typeof s.getSnapshotBeforeUpdate!="function"||c===e.memoizedProps&&k===e.memoizedState||(t.flags|=1024),t.memoizedProps=n,t.memoizedState=V),s.props=n,s.state=V,s.context=d,n=_):(typeof s.componentDidUpdate!="function"||c===e.memoizedProps&&k===e.memoizedState||(t.flags|=4),typeof s.getSnapshotBeforeUpdate!="function"||c===e.memoizedProps&&k===e.memoizedState||(t.flags|=1024),n=!1)}return Si(e,t,r,n,l,o)}function Si(e,t,r,n,o,l){wu(e,t);var s=(t.flags&128)!==0;if(!n&&!s)return o&&Rs(t,r,!1),Ot(e,t,l);n=t.stateNode,Xf.current=t;var c=s&&typeof r.getDerivedStateFromError!="function"?null:n.render();return t.flags|=1,e!==null&&s?(t.child=Mr(t,e.child,null,l),t.child=Mr(t,null,c,l)):Be(e,t,c,l),t.memoizedState=n.state,o&&Rs(t,r,!0),t.child}function Eu(e){var t=e.stateNode;t.pendingContext?Cs(e,t.pendingContext,t.pendingContext!==t.context):t.context&&Cs(e,t.context,!1),ni(e,t.containerInfo)}function ku(e,t,r,n,o){return Fr(),ql(o),t.flags|=256,Be(e,t,r,n),t.child}var wi={dehydrated:null,treeContext:null,retryLane:0};function xi(e){return{baseLanes:e,cachePool:null,transitions:null}}function Cu(e,t,r){var n=t.pendingProps,o=_e.current,l=!1,s=(t.flags&128)!==0,c;if((c=s)||(c=e!==null&&e.memoizedState===null?!1:(o&2)!==0),c?(l=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(o|=1),fe(_e,o&1),e===null)return Ql(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?((t.mode&1)===0?t.lanes=1:e.data==="$!"?t.lanes=8:t.lanes=1073741824,null):(s=n.children,e=n.fallback,l?(n=t.mode,l=t.child,s={mode:"hidden",children:s},(n&1)===0&&l!==null?(l.childLanes=0,l.pendingProps=s):l=Io(s,n,0,null),e=pr(e,n,r,null),l.return=t,e.return=t,l.sibling=e,t.child=l,t.child.memoizedState=xi(r),t.memoizedState=wi,e):Ei(t,s));if(o=e.memoizedState,o!==null&&(c=o.dehydrated,c!==null))return Qf(e,t,s,n,c,o,r);if(l){l=n.fallback,s=t.mode,o=e.child,c=o.sibling;var d={mode:"hidden",children:n.children};return(s&1)===0&&t.child!==o?(n=t.child,n.childLanes=0,n.pendingProps=d,t.deletions=null):(n=Zt(o,d),n.subtreeFlags=o.subtreeFlags&14680064),c!==null?l=Zt(c,l):(l=pr(l,s,r,null),l.flags|=2),l.return=t,n.return=t,n.sibling=l,t.child=n,n=l,l=t.child,s=e.child.memoizedState,s=s===null?xi(r):{baseLanes:s.baseLanes|r,cachePool:null,transitions:s.transitions},l.memoizedState=s,l.childLanes=e.childLanes&~r,t.memoizedState=wi,n}return l=e.child,e=l.sibling,n=Zt(l,{mode:"visible",children:n.children}),(t.mode&1)===0&&(n.lanes=r),n.return=t,n.sibling=null,e!==null&&(r=t.deletions,r===null?(t.deletions=[e],t.flags|=16):r.push(e)),t.child=n,t.memoizedState=null,n}function Ei(e,t){return t=Io({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function Eo(e,t,r,n){return n!==null&&ql(n),Mr(t,e.child,null,r),e=Ei(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Qf(e,t,r,n,o,l,s){if(r)return t.flags&256?(t.flags&=-257,n=gi(Error(a(422))),Eo(e,t,s,n)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(l=n.fallback,o=t.mode,n=Io({mode:"visible",children:n.children},o,0,null),l=pr(l,o,s,null),l.flags|=2,n.return=t,l.return=t,n.sibling=l,t.child=n,(t.mode&1)!==0&&Mr(t,e.child,null,s),t.child.memoizedState=xi(s),t.memoizedState=wi,l);if((t.mode&1)===0)return Eo(e,t,s,null);if(o.data==="$!"){if(n=o.nextSibling&&o.nextSibling.dataset,n)var c=n.dgst;return n=c,l=Error(a(419)),n=gi(l,n,void 0),Eo(e,t,s,n)}if(c=(s&e.childLanes)!==0,Ye||c){if(n=Ne,n!==null){switch(s&-s){case 4:o=2;break;case 16:o=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:o=32;break;case 536870912:o=268435456;break;default:o=0}o=(o&(n.suspendedLanes|s))!==0?0:o,o!==0&&o!==l.retryLane&&(l.retryLane=o,Nt(e,o),yt(n,e,o,-1))}return ji(),n=gi(Error(a(421))),Eo(e,t,s,n)}return o.data==="$?"?(t.flags|=128,t.child=e.child,t=sd.bind(null,e),o._reactRetry=t,null):(e=l.treeContext,ot=Ht(o.nextSibling),nt=t,ye=!0,ht=null,e!==null&&(it[at++]=At,it[at++]=Pt,it[at++]=or,At=e.id,Pt=e.overflow,or=t),t=Ei(t,n.children),t.flags|=4096,t)}function Tu(e,t,r){e.lanes|=t;var n=e.alternate;n!==null&&(n.lanes|=t),ei(e.return,t,r)}function ki(e,t,r,n,o){var l=e.memoizedState;l===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:n,tail:r,tailMode:o}:(l.isBackwards=t,l.rendering=null,l.renderingStartTime=0,l.last=n,l.tail=r,l.tailMode=o)}function Ru(e,t,r){var n=t.pendingProps,o=n.revealOrder,l=n.tail;if(Be(e,t,n.children,r),n=_e.current,(n&2)!==0)n=n&1|2,t.flags|=128;else{if(e!==null&&(e.flags&128)!==0)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Tu(e,r,t);else if(e.tag===19)Tu(e,r,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}n&=1}if(fe(_e,n),(t.mode&1)===0)t.memoizedState=null;else switch(o){case"forwards":for(r=t.child,o=null;r!==null;)e=r.alternate,e!==null&&vo(e)===null&&(o=r),r=r.sibling;r=o,r===null?(o=t.child,t.child=null):(o=r.sibling,r.sibling=null),ki(t,!1,o,r,l);break;case"backwards":for(r=null,o=t.child,t.child=null;o!==null;){if(e=o.alternate,e!==null&&vo(e)===null){t.child=o;break}e=o.sibling,o.sibling=r,r=o,o=e}ki(t,!0,r,null,l);break;case"together":ki(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function ko(e,t){(t.mode&1)===0&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Ot(e,t,r){if(e!==null&&(t.dependencies=e.dependencies),ur|=t.lanes,(r&t.childLanes)===0)return null;if(e!==null&&t.child!==e.child)throw Error(a(153));if(t.child!==null){for(e=t.child,r=Zt(e,e.pendingProps),t.child=r,r.return=t;e.sibling!==null;)e=e.sibling,r=r.sibling=Zt(e,e.pendingProps),r.return=t;r.sibling=null}return t.child}function qf(e,t,r){switch(t.tag){case 3:Eu(t),Fr();break;case 5:Bs(t);break;case 1:We(t.type)&&lo(t);break;case 4:ni(t,t.stateNode.containerInfo);break;case 10:var n=t.type._context,o=t.memoizedProps.value;fe(fo,n._currentValue),n._currentValue=o;break;case 13:if(n=t.memoizedState,n!==null)return n.dehydrated!==null?(fe(_e,_e.current&1),t.flags|=128,null):(r&t.child.childLanes)!==0?Cu(e,t,r):(fe(_e,_e.current&1),e=Ot(e,t,r),e!==null?e.sibling:null);fe(_e,_e.current&1);break;case 19:if(n=(r&t.childLanes)!==0,(e.flags&128)!==0){if(n)return Ru(e,t,r);t.flags|=128}if(o=t.memoizedState,o!==null&&(o.rendering=null,o.tail=null,o.lastEffect=null),fe(_e,_e.current),n)break;return null;case 22:case 23:return t.lanes=0,Su(e,t,r)}return Ot(e,t,r)}var Lu,Ci,Au,Pu;Lu=function(e,t){for(var r=t.child;r!==null;){if(r.tag===5||r.tag===6)e.appendChild(r.stateNode);else if(r.tag!==4&&r.child!==null){r.child.return=r,r=r.child;continue}if(r===t)break;for(;r.sibling===null;){if(r.return===null||r.return===t)return;r=r.return}r.sibling.return=r.return,r=r.sibling}},Ci=function(){},Au=function(e,t,r,n){var o=e.memoizedProps;if(o!==n){e=t.stateNode,ar(xt.current);var l=null;switch(r){case"input":o=el(e,o),n=el(e,n),l=[];break;case"select":o=j({},o,{value:void 0}),n=j({},n,{value:void 0}),l=[];break;case"textarea":o=nl(e,o),n=nl(e,n),l=[];break;default:typeof o.onClick!="function"&&typeof n.onClick=="function"&&(e.onclick=ro)}ll(r,n);var s;r=null;for(_ in o)if(!n.hasOwnProperty(_)&&o.hasOwnProperty(_)&&o[_]!=null)if(_==="style"){var c=o[_];for(s in c)c.hasOwnProperty(s)&&(r||(r={}),r[s]="")}else _!=="dangerouslySetInnerHTML"&&_!=="children"&&_!=="suppressContentEditableWarning"&&_!=="suppressHydrationWarning"&&_!=="autoFocus"&&(f.hasOwnProperty(_)?l||(l=[]):(l=l||[]).push(_,null));for(_ in n){var d=n[_];if(c=o!=null?o[_]:void 0,n.hasOwnProperty(_)&&d!==c&&(d!=null||c!=null))if(_==="style")if(c){for(s in c)!c.hasOwnProperty(s)||d&&d.hasOwnProperty(s)||(r||(r={}),r[s]="");for(s in d)d.hasOwnProperty(s)&&c[s]!==d[s]&&(r||(r={}),r[s]=d[s])}else r||(l||(l=[]),l.push(_,r)),r=d;else _==="dangerouslySetInnerHTML"?(d=d?d.__html:void 0,c=c?c.__html:void 0,d!=null&&c!==d&&(l=l||[]).push(_,d)):_==="children"?typeof d!="string"&&typeof d!="number"||(l=l||[]).push(_,""+d):_!=="suppressContentEditableWarning"&&_!=="suppressHydrationWarning"&&(f.hasOwnProperty(_)?(d!=null&&_==="onScroll"&&me("scroll",e),l||c===d||(l=[])):(l=l||[]).push(_,d))}r&&(l=l||[]).push("style",r);var _=l;(t.updateQueue=_)&&(t.flags|=4)}},Pu=function(e,t,r,n){r!==n&&(t.flags|=4)};function kn(e,t){if(!ye)switch(e.tailMode){case"hidden":t=e.tail;for(var r=null;t!==null;)t.alternate!==null&&(r=t),t=t.sibling;r===null?e.tail=null:r.sibling=null;break;case"collapsed":r=e.tail;for(var n=null;r!==null;)r.alternate!==null&&(n=r),r=r.sibling;n===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:n.sibling=null}}function je(e){var t=e.alternate!==null&&e.alternate.child===e.child,r=0,n=0;if(t)for(var o=e.child;o!==null;)r|=o.lanes|o.childLanes,n|=o.subtreeFlags&14680064,n|=o.flags&14680064,o.return=e,o=o.sibling;else for(o=e.child;o!==null;)r|=o.lanes|o.childLanes,n|=o.subtreeFlags,n|=o.flags,o.return=e,o=o.sibling;return e.subtreeFlags|=n,e.childLanes=r,t}function Kf(e,t,r){var n=t.pendingProps;switch($l(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return je(t),null;case 1:return We(t.type)&&oo(),je(t),null;case 3:return n=t.stateNode,zr(),ve(Ge),ve(Ue),ii(),n.pendingContext&&(n.context=n.pendingContext,n.pendingContext=null),(e===null||e.child===null)&&(uo(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&(t.flags&256)===0||(t.flags|=1024,ht!==null&&(Ii(ht),ht=null))),Ci(e,t),je(t),null;case 5:oi(t);var o=ar(_n.current);if(r=t.type,e!==null&&t.stateNode!=null)Au(e,t,r,n,o),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!n){if(t.stateNode===null)throw Error(a(166));return je(t),null}if(e=ar(xt.current),uo(t)){n=t.stateNode,r=t.type;var l=t.memoizedProps;switch(n[wt]=t,n[hn]=l,e=(t.mode&1)!==0,r){case"dialog":me("cancel",n),me("close",n);break;case"iframe":case"object":case"embed":me("load",n);break;case"video":case"audio":for(o=0;o<fn.length;o++)me(fn[o],n);break;case"source":me("error",n);break;case"img":case"image":case"link":me("error",n),me("load",n);break;case"details":me("toggle",n);break;case"input":ca(n,l),me("invalid",n);break;case"select":n._wrapperState={wasMultiple:!!l.multiple},me("invalid",n);break;case"textarea":pa(n,l),me("invalid",n)}ll(r,l),o=null;for(var s in l)if(l.hasOwnProperty(s)){var c=l[s];s==="children"?typeof c=="string"?n.textContent!==c&&(l.suppressHydrationWarning!==!0&&to(n.textContent,c,e),o=["children",c]):typeof c=="number"&&n.textContent!==""+c&&(l.suppressHydrationWarning!==!0&&to(n.textContent,c,e),o=["children",""+c]):f.hasOwnProperty(s)&&c!=null&&s==="onScroll"&&me("scroll",n)}switch(r){case"input":Dn(n),da(n,l,!0);break;case"textarea":Dn(n),ma(n);break;case"select":case"option":break;default:typeof l.onClick=="function"&&(n.onclick=ro)}n=o,t.updateQueue=n,n!==null&&(t.flags|=4)}else{s=o.nodeType===9?o:o.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=va(r)),e==="http://www.w3.org/1999/xhtml"?r==="script"?(e=s.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof n.is=="string"?e=s.createElement(r,{is:n.is}):(e=s.createElement(r),r==="select"&&(s=e,n.multiple?s.multiple=!0:n.size&&(s.size=n.size))):e=s.createElementNS(e,r),e[wt]=t,e[hn]=n,Lu(e,t,!1,!1),t.stateNode=e;e:{switch(s=il(r,n),r){case"dialog":me("cancel",e),me("close",e),o=n;break;case"iframe":case"object":case"embed":me("load",e),o=n;break;case"video":case"audio":for(o=0;o<fn.length;o++)me(fn[o],e);o=n;break;case"source":me("error",e),o=n;break;case"img":case"image":case"link":me("error",e),me("load",e),o=n;break;case"details":me("toggle",e),o=n;break;case"input":ca(e,n),o=el(e,n),me("invalid",e);break;case"option":o=n;break;case"select":e._wrapperState={wasMultiple:!!n.multiple},o=j({},n,{value:void 0}),me("invalid",e);break;case"textarea":pa(e,n),o=nl(e,n),me("invalid",e);break;default:o=n}ll(r,o),c=o;for(l in c)if(c.hasOwnProperty(l)){var d=c[l];l==="style"?_a(e,d):l==="dangerouslySetInnerHTML"?(d=d?d.__html:void 0,d!=null&&ga(e,d)):l==="children"?typeof d=="string"?(r!=="textarea"||d!=="")&&Wr(e,d):typeof d=="number"&&Wr(e,""+d):l!=="suppressContentEditableWarning"&&l!=="suppressHydrationWarning"&&l!=="autoFocus"&&(f.hasOwnProperty(l)?d!=null&&l==="onScroll"&&me("scroll",e):d!=null&&re(e,l,d,s))}switch(r){case"input":Dn(e),da(e,n,!1);break;case"textarea":Dn(e),ma(e);break;case"option":n.value!=null&&e.setAttribute("value",""+ae(n.value));break;case"select":e.multiple=!!n.multiple,l=n.value,l!=null?_r(e,!!n.multiple,l,!1):n.defaultValue!=null&&_r(e,!!n.multiple,n.defaultValue,!0);break;default:typeof o.onClick=="function"&&(e.onclick=ro)}switch(r){case"button":case"input":case"select":case"textarea":n=!!n.autoFocus;break e;case"img":n=!0;break e;default:n=!1}}n&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return je(t),null;case 6:if(e&&t.stateNode!=null)Pu(e,t,e.memoizedProps,n);else{if(typeof n!="string"&&t.stateNode===null)throw Error(a(166));if(r=ar(_n.current),ar(xt.current),uo(t)){if(n=t.stateNode,r=t.memoizedProps,n[wt]=t,(l=n.nodeValue!==r)&&(e=nt,e!==null))switch(e.tag){case 3:to(n.nodeValue,r,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&to(n.nodeValue,r,(e.mode&1)!==0)}l&&(t.flags|=4)}else n=(r.nodeType===9?r:r.ownerDocument).createTextNode(n),n[wt]=t,t.stateNode=n}return je(t),null;case 13:if(ve(_e),n=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(ye&&ot!==null&&(t.mode&1)!==0&&(t.flags&128)===0)Os(),Fr(),t.flags|=98560,l=!1;else if(l=uo(t),n!==null&&n.dehydrated!==null){if(e===null){if(!l)throw Error(a(318));if(l=t.memoizedState,l=l!==null?l.dehydrated:null,!l)throw Error(a(317));l[wt]=t}else Fr(),(t.flags&128)===0&&(t.memoizedState=null),t.flags|=4;je(t),l=!1}else ht!==null&&(Ii(ht),ht=null),l=!0;if(!l)return t.flags&65536?t:null}return(t.flags&128)!==0?(t.lanes=r,t):(n=n!==null,n!==(e!==null&&e.memoizedState!==null)&&n&&(t.child.flags|=8192,(t.mode&1)!==0&&(e===null||(_e.current&1)!==0?Le===0&&(Le=3):ji())),t.updateQueue!==null&&(t.flags|=4),je(t),null);case 4:return zr(),Ci(e,t),e===null&&dn(t.stateNode.containerInfo),je(t),null;case 10:return Zl(t.type._context),je(t),null;case 17:return We(t.type)&&oo(),je(t),null;case 19:if(ve(_e),l=t.memoizedState,l===null)return je(t),null;if(n=(t.flags&128)!==0,s=l.rendering,s===null)if(n)kn(l,!1);else{if(Le!==0||e!==null&&(e.flags&128)!==0)for(e=t.child;e!==null;){if(s=vo(e),s!==null){for(t.flags|=128,kn(l,!1),n=s.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),t.subtreeFlags=0,n=r,r=t.child;r!==null;)l=r,e=n,l.flags&=14680066,s=l.alternate,s===null?(l.childLanes=0,l.lanes=e,l.child=null,l.subtreeFlags=0,l.memoizedProps=null,l.memoizedState=null,l.updateQueue=null,l.dependencies=null,l.stateNode=null):(l.childLanes=s.childLanes,l.lanes=s.lanes,l.child=s.child,l.subtreeFlags=0,l.deletions=null,l.memoizedProps=s.memoizedProps,l.memoizedState=s.memoizedState,l.updateQueue=s.updateQueue,l.type=s.type,e=s.dependencies,l.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),r=r.sibling;return fe(_e,_e.current&1|2),t.child}e=e.sibling}l.tail!==null&&Ee()>Hr&&(t.flags|=128,n=!0,kn(l,!1),t.lanes=4194304)}else{if(!n)if(e=vo(s),e!==null){if(t.flags|=128,n=!0,r=e.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),kn(l,!0),l.tail===null&&l.tailMode==="hidden"&&!s.alternate&&!ye)return je(t),null}else 2*Ee()-l.renderingStartTime>Hr&&r!==1073741824&&(t.flags|=128,n=!0,kn(l,!1),t.lanes=4194304);l.isBackwards?(s.sibling=t.child,t.child=s):(r=l.last,r!==null?r.sibling=s:t.child=s,l.last=s)}return l.tail!==null?(t=l.tail,l.rendering=t,l.tail=t.sibling,l.renderingStartTime=Ee(),t.sibling=null,r=_e.current,fe(_e,n?r&1|2:r&1),t):(je(t),null);case 22:case 23:return zi(),n=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==n&&(t.flags|=8192),n&&(t.mode&1)!==0?(lt&1073741824)!==0&&(je(t),t.subtreeFlags&6&&(t.flags|=8192)):je(t),null;case 24:return null;case 25:return null}throw Error(a(156,t.tag))}function Jf(e,t){switch($l(t),t.tag){case 1:return We(t.type)&&oo(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return zr(),ve(Ge),ve(Ue),ii(),e=t.flags,(e&65536)!==0&&(e&128)===0?(t.flags=e&-65537|128,t):null;case 5:return oi(t),null;case 13:if(ve(_e),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(a(340));Fr()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return ve(_e),null;case 4:return zr(),null;case 10:return Zl(t.type._context),null;case 22:case 23:return zi(),null;case 24:return null;default:return null}}var Co=!1,be=!1,Zf=typeof WeakSet=="function"?WeakSet:Set,b=null;function br(e,t){var r=e.ref;if(r!==null)if(typeof r=="function")try{r(null)}catch(n){we(e,t,n)}else r.current=null}function Ti(e,t,r){try{r()}catch(n){we(e,t,n)}}var Nu=!1;function ed(e,t){if(zl=Gn,e=us(),Pl(e)){if("selectionStart"in e)var r={start:e.selectionStart,end:e.selectionEnd};else e:{r=(r=e.ownerDocument)&&r.defaultView||window;var n=r.getSelection&&r.getSelection();if(n&&n.rangeCount!==0){r=n.anchorNode;var o=n.anchorOffset,l=n.focusNode;n=n.focusOffset;try{r.nodeType,l.nodeType}catch{r=null;break e}var s=0,c=-1,d=-1,_=0,R=0,L=e,k=null;t:for(;;){for(var U;L!==r||o!==0&&L.nodeType!==3||(c=s+o),L!==l||n!==0&&L.nodeType!==3||(d=s+n),L.nodeType===3&&(s+=L.nodeValue.length),(U=L.firstChild)!==null;)k=L,L=U;for(;;){if(L===e)break t;if(k===r&&++_===o&&(c=s),k===l&&++R===n&&(d=s),(U=L.nextSibling)!==null)break;L=k,k=L.parentNode}L=U}r=c===-1||d===-1?null:{start:c,end:d}}else r=null}r=r||{start:0,end:0}}else r=null;for(jl={focusedElem:e,selectionRange:r},Gn=!1,b=t;b!==null;)if(t=b,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,b=e;else for(;b!==null;){t=b;try{var V=t.alternate;if((t.flags&1024)!==0)switch(t.tag){case 0:case 11:case 15:break;case 1:if(V!==null){var G=V.memoizedProps,ke=V.memoizedState,v=t.stateNode,p=v.getSnapshotBeforeUpdate(t.elementType===t.type?G:mt(t.type,G),ke);v.__reactInternalSnapshotBeforeUpdate=p}break;case 3:var g=t.stateNode.containerInfo;g.nodeType===1?g.textContent="":g.nodeType===9&&g.documentElement&&g.removeChild(g.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(a(163))}}catch(P){we(t,t.return,P)}if(e=t.sibling,e!==null){e.return=t.return,b=e;break}b=t.return}return V=Nu,Nu=!1,V}function Cn(e,t,r){var n=t.updateQueue;if(n=n!==null?n.lastEffect:null,n!==null){var o=n=n.next;do{if((o.tag&e)===e){var l=o.destroy;o.destroy=void 0,l!==void 0&&Ti(t,r,l)}o=o.next}while(o!==n)}}function To(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var r=t=t.next;do{if((r.tag&e)===e){var n=r.create;r.destroy=n()}r=r.next}while(r!==t)}}function Ri(e){var t=e.ref;if(t!==null){var r=e.stateNode;switch(e.tag){case 5:e=r;break;default:e=r}typeof t=="function"?t(e):t.current=e}}function Du(e){var t=e.alternate;t!==null&&(e.alternate=null,Du(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[wt],delete t[hn],delete t[Vl],delete t[If],delete t[Uf])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function Ou(e){return e.tag===5||e.tag===3||e.tag===4}function Fu(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||Ou(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Li(e,t,r){var n=e.tag;if(n===5||n===6)e=e.stateNode,t?r.nodeType===8?r.parentNode.insertBefore(e,t):r.insertBefore(e,t):(r.nodeType===8?(t=r.parentNode,t.insertBefore(e,r)):(t=r,t.appendChild(e)),r=r._reactRootContainer,r!=null||t.onclick!==null||(t.onclick=ro));else if(n!==4&&(e=e.child,e!==null))for(Li(e,t,r),e=e.sibling;e!==null;)Li(e,t,r),e=e.sibling}function Ai(e,t,r){var n=e.tag;if(n===5||n===6)e=e.stateNode,t?r.insertBefore(e,t):r.appendChild(e);else if(n!==4&&(e=e.child,e!==null))for(Ai(e,t,r),e=e.sibling;e!==null;)Ai(e,t,r),e=e.sibling}var Fe=null,vt=!1;function Xt(e,t,r){for(r=r.child;r!==null;)Mu(e,t,r),r=r.sibling}function Mu(e,t,r){if(St&&typeof St.onCommitFiberUnmount=="function")try{St.onCommitFiberUnmount(zn,r)}catch{}switch(r.tag){case 5:be||br(r,t);case 6:var n=Fe,o=vt;Fe=null,Xt(e,t,r),Fe=n,vt=o,Fe!==null&&(vt?(e=Fe,r=r.stateNode,e.nodeType===8?e.parentNode.removeChild(r):e.removeChild(r)):Fe.removeChild(r.stateNode));break;case 18:Fe!==null&&(vt?(e=Fe,r=r.stateNode,e.nodeType===8?Hl(e.parentNode,r):e.nodeType===1&&Hl(e,r),rn(e)):Hl(Fe,r.stateNode));break;case 4:n=Fe,o=vt,Fe=r.stateNode.containerInfo,vt=!0,Xt(e,t,r),Fe=n,vt=o;break;case 0:case 11:case 14:case 15:if(!be&&(n=r.updateQueue,n!==null&&(n=n.lastEffect,n!==null))){o=n=n.next;do{var l=o,s=l.destroy;l=l.tag,s!==void 0&&((l&2)!==0||(l&4)!==0)&&Ti(r,t,s),o=o.next}while(o!==n)}Xt(e,t,r);break;case 1:if(!be&&(br(r,t),n=r.stateNode,typeof n.componentWillUnmount=="function"))try{n.props=r.memoizedProps,n.state=r.memoizedState,n.componentWillUnmount()}catch(c){we(r,t,c)}Xt(e,t,r);break;case 21:Xt(e,t,r);break;case 22:r.mode&1?(be=(n=be)||r.memoizedState!==null,Xt(e,t,r),be=n):Xt(e,t,r);break;default:Xt(e,t,r)}}function Iu(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var r=e.stateNode;r===null&&(r=e.stateNode=new Zf),t.forEach(function(n){var o=ud.bind(null,e,n);r.has(n)||(r.add(n),n.then(o,o))})}}function gt(e,t){var r=t.deletions;if(r!==null)for(var n=0;n<r.length;n++){var o=r[n];try{var l=e,s=t,c=s;e:for(;c!==null;){switch(c.tag){case 5:Fe=c.stateNode,vt=!1;break e;case 3:Fe=c.stateNode.containerInfo,vt=!0;break e;case 4:Fe=c.stateNode.containerInfo,vt=!0;break e}c=c.return}if(Fe===null)throw Error(a(160));Mu(l,s,o),Fe=null,vt=!1;var d=o.alternate;d!==null&&(d.return=null),o.return=null}catch(_){we(o,t,_)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Uu(t,e),t=t.sibling}function Uu(e,t){var r=e.alternate,n=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(gt(t,e),kt(e),n&4){try{Cn(3,e,e.return),To(3,e)}catch(G){we(e,e.return,G)}try{Cn(5,e,e.return)}catch(G){we(e,e.return,G)}}break;case 1:gt(t,e),kt(e),n&512&&r!==null&&br(r,r.return);break;case 5:if(gt(t,e),kt(e),n&512&&r!==null&&br(r,r.return),e.flags&32){var o=e.stateNode;try{Wr(o,"")}catch(G){we(e,e.return,G)}}if(n&4&&(o=e.stateNode,o!=null)){var l=e.memoizedProps,s=r!==null?r.memoizedProps:l,c=e.type,d=e.updateQueue;if(e.updateQueue=null,d!==null)try{c==="input"&&l.type==="radio"&&l.name!=null&&fa(o,l),il(c,s);var _=il(c,l);for(s=0;s<d.length;s+=2){var R=d[s],L=d[s+1];R==="style"?_a(o,L):R==="dangerouslySetInnerHTML"?ga(o,L):R==="children"?Wr(o,L):re(o,R,L,_)}switch(c){case"input":tl(o,l);break;case"textarea":ha(o,l);break;case"select":var k=o._wrapperState.wasMultiple;o._wrapperState.wasMultiple=!!l.multiple;var U=l.value;U!=null?_r(o,!!l.multiple,U,!1):k!==!!l.multiple&&(l.defaultValue!=null?_r(o,!!l.multiple,l.defaultValue,!0):_r(o,!!l.multiple,l.multiple?[]:"",!1))}o[hn]=l}catch(G){we(e,e.return,G)}}break;case 6:if(gt(t,e),kt(e),n&4){if(e.stateNode===null)throw Error(a(162));o=e.stateNode,l=e.memoizedProps;try{o.nodeValue=l}catch(G){we(e,e.return,G)}}break;case 3:if(gt(t,e),kt(e),n&4&&r!==null&&r.memoizedState.isDehydrated)try{rn(t.containerInfo)}catch(G){we(e,e.return,G)}break;case 4:gt(t,e),kt(e);break;case 13:gt(t,e),kt(e),o=e.child,o.flags&8192&&(l=o.memoizedState!==null,o.stateNode.isHidden=l,!l||o.alternate!==null&&o.alternate.memoizedState!==null||(Di=Ee())),n&4&&Iu(e);break;case 22:if(R=r!==null&&r.memoizedState!==null,e.mode&1?(be=(_=be)||R,gt(t,e),be=_):gt(t,e),kt(e),n&8192){if(_=e.memoizedState!==null,(e.stateNode.isHidden=_)&&!R&&(e.mode&1)!==0)for(b=e,R=e.child;R!==null;){for(L=b=R;b!==null;){switch(k=b,U=k.child,k.tag){case 0:case 11:case 14:case 15:Cn(4,k,k.return);break;case 1:br(k,k.return);var V=k.stateNode;if(typeof V.componentWillUnmount=="function"){n=k,r=k.return;try{t=n,V.props=t.memoizedProps,V.state=t.memoizedState,V.componentWillUnmount()}catch(G){we(n,r,G)}}break;case 5:br(k,k.return);break;case 22:if(k.memoizedState!==null){bu(L);continue}}U!==null?(U.return=k,b=U):bu(L)}R=R.sibling}e:for(R=null,L=e;;){if(L.tag===5){if(R===null){R=L;try{o=L.stateNode,_?(l=o.style,typeof l.setProperty=="function"?l.setProperty("display","none","important"):l.display="none"):(c=L.stateNode,d=L.memoizedProps.style,s=d!=null&&d.hasOwnProperty("display")?d.display:null,c.style.display=ya("display",s))}catch(G){we(e,e.return,G)}}}else if(L.tag===6){if(R===null)try{L.stateNode.nodeValue=_?"":L.memoizedProps}catch(G){we(e,e.return,G)}}else if((L.tag!==22&&L.tag!==23||L.memoizedState===null||L===e)&&L.child!==null){L.child.return=L,L=L.child;continue}if(L===e)break e;for(;L.sibling===null;){if(L.return===null||L.return===e)break e;R===L&&(R=null),L=L.return}R===L&&(R=null),L.sibling.return=L.return,L=L.sibling}}break;case 19:gt(t,e),kt(e),n&4&&Iu(e);break;case 21:break;default:gt(t,e),kt(e)}}function kt(e){var t=e.flags;if(t&2){try{e:{for(var r=e.return;r!==null;){if(Ou(r)){var n=r;break e}r=r.return}throw Error(a(160))}switch(n.tag){case 5:var o=n.stateNode;n.flags&32&&(Wr(o,""),n.flags&=-33);var l=Fu(e);Ai(e,l,o);break;case 3:case 4:var s=n.stateNode.containerInfo,c=Fu(e);Li(e,c,s);break;default:throw Error(a(161))}}catch(d){we(e,e.return,d)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function td(e,t,r){b=e,zu(e)}function zu(e,t,r){for(var n=(e.mode&1)!==0;b!==null;){var o=b,l=o.child;if(o.tag===22&&n){var s=o.memoizedState!==null||Co;if(!s){var c=o.alternate,d=c!==null&&c.memoizedState!==null||be;c=Co;var _=be;if(Co=s,(be=d)&&!_)for(b=o;b!==null;)s=b,d=s.child,s.tag===22&&s.memoizedState!==null?Bu(o):d!==null?(d.return=s,b=d):Bu(o);for(;l!==null;)b=l,zu(l),l=l.sibling;b=o,Co=c,be=_}ju(e)}else(o.subtreeFlags&8772)!==0&&l!==null?(l.return=o,b=l):ju(e)}}function ju(e){for(;b!==null;){var t=b;if((t.flags&8772)!==0){var r=t.alternate;try{if((t.flags&8772)!==0)switch(t.tag){case 0:case 11:case 15:be||To(5,t);break;case 1:var n=t.stateNode;if(t.flags&4&&!be)if(r===null)n.componentDidMount();else{var o=t.elementType===t.type?r.memoizedProps:mt(t.type,r.memoizedProps);n.componentDidUpdate(o,r.memoizedState,n.__reactInternalSnapshotBeforeUpdate)}var l=t.updateQueue;l!==null&&bs(t,l,n);break;case 3:var s=t.updateQueue;if(s!==null){if(r=null,t.child!==null)switch(t.child.tag){case 5:r=t.child.stateNode;break;case 1:r=t.child.stateNode}bs(t,s,r)}break;case 5:var c=t.stateNode;if(r===null&&t.flags&4){r=c;var d=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":d.autoFocus&&r.focus();break;case"img":d.src&&(r.src=d.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var _=t.alternate;if(_!==null){var R=_.memoizedState;if(R!==null){var L=R.dehydrated;L!==null&&rn(L)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(a(163))}be||t.flags&512&&Ri(t)}catch(k){we(t,t.return,k)}}if(t===e){b=null;break}if(r=t.sibling,r!==null){r.return=t.return,b=r;break}b=t.return}}function bu(e){for(;b!==null;){var t=b;if(t===e){b=null;break}var r=t.sibling;if(r!==null){r.return=t.return,b=r;break}b=t.return}}function Bu(e){for(;b!==null;){var t=b;try{switch(t.tag){case 0:case 11:case 15:var r=t.return;try{To(4,t)}catch(d){we(t,r,d)}break;case 1:var n=t.stateNode;if(typeof n.componentDidMount=="function"){var o=t.return;try{n.componentDidMount()}catch(d){we(t,o,d)}}var l=t.return;try{Ri(t)}catch(d){we(t,l,d)}break;case 5:var s=t.return;try{Ri(t)}catch(d){we(t,s,d)}}}catch(d){we(t,t.return,d)}if(t===e){b=null;break}var c=t.sibling;if(c!==null){c.return=t.return,b=c;break}b=t.return}}var rd=Math.ceil,Ro=H.ReactCurrentDispatcher,Pi=H.ReactCurrentOwner,ct=H.ReactCurrentBatchConfig,ne=0,Ne=null,Te=null,Me=0,lt=0,Br=Vt(0),Le=0,Tn=null,ur=0,Lo=0,Ni=0,Rn=null,$e=null,Di=0,Hr=1/0,Ft=null,Ao=!1,Oi=null,Qt=null,Po=!1,qt=null,No=0,Ln=0,Fi=null,Do=-1,Oo=0;function He(){return(ne&6)!==0?Ee():Do!==-1?Do:Do=Ee()}function Kt(e){return(e.mode&1)===0?1:(ne&2)!==0&&Me!==0?Me&-Me:jf.transition!==null?(Oo===0&&(Oo=Fa()),Oo):(e=se,e!==0||(e=window.event,e=e===void 0?16:Va(e.type)),e)}function yt(e,t,r,n){if(50<Ln)throw Ln=0,Fi=null,Error(a(185));Kr(e,r,n),((ne&2)===0||e!==Ne)&&(e===Ne&&((ne&2)===0&&(Lo|=r),Le===4&&Jt(e,Me)),Xe(e,n),r===1&&ne===0&&(t.mode&1)===0&&(Hr=Ee()+500,io&&Wt()))}function Xe(e,t){var r=e.callbackNode;zc(e,t);var n=Bn(e,e===Ne?Me:0);if(n===0)r!==null&&Na(r),e.callbackNode=null,e.callbackPriority=0;else if(t=n&-n,e.callbackPriority!==t){if(r!=null&&Na(r),t===1)e.tag===0?zf(Vu.bind(null,e)):Ls(Vu.bind(null,e)),Ff(function(){(ne&6)===0&&Wt()}),r=null;else{switch(Ma(n)){case 1:r=pl;break;case 4:r=Da;break;case 16:r=Un;break;case 536870912:r=Oa;break;default:r=Un}r=Ku(r,Hu.bind(null,e))}e.callbackPriority=t,e.callbackNode=r}}function Hu(e,t){if(Do=-1,Oo=0,(ne&6)!==0)throw Error(a(327));var r=e.callbackNode;if(Vr()&&e.callbackNode!==r)return null;var n=Bn(e,e===Ne?Me:0);if(n===0)return null;if((n&30)!==0||(n&e.expiredLanes)!==0||t)t=Fo(e,n);else{t=n;var o=ne;ne|=2;var l=Wu();(Ne!==e||Me!==t)&&(Ft=null,Hr=Ee()+500,fr(e,t));do try{ld();break}catch(c){Gu(e,c)}while(!0);Jl(),Ro.current=l,ne=o,Te!==null?t=0:(Ne=null,Me=0,t=Le)}if(t!==0){if(t===2&&(o=hl(e),o!==0&&(n=o,t=Mi(e,o))),t===1)throw r=Tn,fr(e,0),Jt(e,n),Xe(e,Ee()),r;if(t===6)Jt(e,n);else{if(o=e.current.alternate,(n&30)===0&&!nd(o)&&(t=Fo(e,n),t===2&&(l=hl(e),l!==0&&(n=l,t=Mi(e,l))),t===1))throw r=Tn,fr(e,0),Jt(e,n),Xe(e,Ee()),r;switch(e.finishedWork=o,e.finishedLanes=n,t){case 0:case 1:throw Error(a(345));case 2:dr(e,$e,Ft);break;case 3:if(Jt(e,n),(n&130023424)===n&&(t=Di+500-Ee(),10<t)){if(Bn(e,0)!==0)break;if(o=e.suspendedLanes,(o&n)!==n){He(),e.pingedLanes|=e.suspendedLanes&o;break}e.timeoutHandle=Bl(dr.bind(null,e,$e,Ft),t);break}dr(e,$e,Ft);break;case 4:if(Jt(e,n),(n&4194240)===n)break;for(t=e.eventTimes,o=-1;0<n;){var s=31-dt(n);l=1<<s,s=t[s],s>o&&(o=s),n&=~l}if(n=o,n=Ee()-n,n=(120>n?120:480>n?480:1080>n?1080:1920>n?1920:3e3>n?3e3:4320>n?4320:1960*rd(n/1960))-n,10<n){e.timeoutHandle=Bl(dr.bind(null,e,$e,Ft),n);break}dr(e,$e,Ft);break;case 5:dr(e,$e,Ft);break;default:throw Error(a(329))}}}return Xe(e,Ee()),e.callbackNode===r?Hu.bind(null,e):null}function Mi(e,t){var r=Rn;return e.current.memoizedState.isDehydrated&&(fr(e,t).flags|=256),e=Fo(e,t),e!==2&&(t=$e,$e=r,t!==null&&Ii(t)),e}function Ii(e){$e===null?$e=e:$e.push.apply($e,e)}function nd(e){for(var t=e;;){if(t.flags&16384){var r=t.updateQueue;if(r!==null&&(r=r.stores,r!==null))for(var n=0;n<r.length;n++){var o=r[n],l=o.getSnapshot;o=o.value;try{if(!pt(l(),o))return!1}catch{return!1}}}if(r=t.child,t.subtreeFlags&16384&&r!==null)r.return=t,t=r;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function Jt(e,t){for(t&=~Ni,t&=~Lo,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var r=31-dt(t),n=1<<r;e[r]=-1,t&=~n}}function Vu(e){if((ne&6)!==0)throw Error(a(327));Vr();var t=Bn(e,0);if((t&1)===0)return Xe(e,Ee()),null;var r=Fo(e,t);if(e.tag!==0&&r===2){var n=hl(e);n!==0&&(t=n,r=Mi(e,n))}if(r===1)throw r=Tn,fr(e,0),Jt(e,t),Xe(e,Ee()),r;if(r===6)throw Error(a(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,dr(e,$e,Ft),Xe(e,Ee()),null}function Ui(e,t){var r=ne;ne|=1;try{return e(t)}finally{ne=r,ne===0&&(Hr=Ee()+500,io&&Wt())}}function cr(e){qt!==null&&qt.tag===0&&(ne&6)===0&&Vr();var t=ne;ne|=1;var r=ct.transition,n=se;try{if(ct.transition=null,se=1,e)return e()}finally{se=n,ct.transition=r,ne=t,(ne&6)===0&&Wt()}}function zi(){lt=Br.current,ve(Br)}function fr(e,t){e.finishedWork=null,e.finishedLanes=0;var r=e.timeoutHandle;if(r!==-1&&(e.timeoutHandle=-1,Of(r)),Te!==null)for(r=Te.return;r!==null;){var n=r;switch($l(n),n.tag){case 1:n=n.type.childContextTypes,n!=null&&oo();break;case 3:zr(),ve(Ge),ve(Ue),ii();break;case 5:oi(n);break;case 4:zr();break;case 13:ve(_e);break;case 19:ve(_e);break;case 10:Zl(n.type._context);break;case 22:case 23:zi()}r=r.return}if(Ne=e,Te=e=Zt(e.current,null),Me=lt=t,Le=0,Tn=null,Ni=Lo=ur=0,$e=Rn=null,ir!==null){for(t=0;t<ir.length;t++)if(r=ir[t],n=r.interleaved,n!==null){r.interleaved=null;var o=n.next,l=r.pending;if(l!==null){var s=l.next;l.next=o,n.next=s}r.pending=n}ir=null}return e}function Gu(e,t){do{var r=Te;try{if(Jl(),go.current=wo,yo){for(var n=Se.memoizedState;n!==null;){var o=n.queue;o!==null&&(o.pending=null),n=n.next}yo=!1}if(sr=0,Pe=Re=Se=null,Sn=!1,wn=0,Pi.current=null,r===null||r.return===null){Le=1,Tn=t,Te=null;break}e:{var l=e,s=r.return,c=r,d=t;if(t=Me,c.flags|=32768,d!==null&&typeof d=="object"&&typeof d.then=="function"){var _=d,R=c,L=R.tag;if((R.mode&1)===0&&(L===0||L===11||L===15)){var k=R.alternate;k?(R.updateQueue=k.updateQueue,R.memoizedState=k.memoizedState,R.lanes=k.lanes):(R.updateQueue=null,R.memoizedState=null)}var U=mu(s);if(U!==null){U.flags&=-257,vu(U,s,c,l,t),U.mode&1&&hu(l,_,t),t=U,d=_;var V=t.updateQueue;if(V===null){var G=new Set;G.add(d),t.updateQueue=G}else V.add(d);break e}else{if((t&1)===0){hu(l,_,t),ji();break e}d=Error(a(426))}}else if(ye&&c.mode&1){var ke=mu(s);if(ke!==null){(ke.flags&65536)===0&&(ke.flags|=256),vu(ke,s,c,l,t),ql(jr(d,c));break e}}l=d=jr(d,c),Le!==4&&(Le=2),Rn===null?Rn=[l]:Rn.push(l),l=s;do{switch(l.tag){case 3:l.flags|=65536,t&=-t,l.lanes|=t;var v=du(l,d,t);js(l,v);break e;case 1:c=d;var p=l.type,g=l.stateNode;if((l.flags&128)===0&&(typeof p.getDerivedStateFromError=="function"||g!==null&&typeof g.componentDidCatch=="function"&&(Qt===null||!Qt.has(g)))){l.flags|=65536,t&=-t,l.lanes|=t;var P=pu(l,c,t);js(l,P);break e}}l=l.return}while(l!==null)}$u(r)}catch(W){t=W,Te===r&&r!==null&&(Te=r=r.return);continue}break}while(!0)}function Wu(){var e=Ro.current;return Ro.current=wo,e===null?wo:e}function ji(){(Le===0||Le===3||Le===2)&&(Le=4),Ne===null||(ur&268435455)===0&&(Lo&268435455)===0||Jt(Ne,Me)}function Fo(e,t){var r=ne;ne|=2;var n=Wu();(Ne!==e||Me!==t)&&(Ft=null,fr(e,t));do try{od();break}catch(o){Gu(e,o)}while(!0);if(Jl(),ne=r,Ro.current=n,Te!==null)throw Error(a(261));return Ne=null,Me=0,Le}function od(){for(;Te!==null;)Yu(Te)}function ld(){for(;Te!==null&&!Ac();)Yu(Te)}function Yu(e){var t=qu(e.alternate,e,lt);e.memoizedProps=e.pendingProps,t===null?$u(e):Te=t,Pi.current=null}function $u(e){var t=e;do{var r=t.alternate;if(e=t.return,(t.flags&32768)===0){if(r=Kf(r,t,lt),r!==null){Te=r;return}}else{if(r=Jf(r,t),r!==null){r.flags&=32767,Te=r;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{Le=6,Te=null;return}}if(t=t.sibling,t!==null){Te=t;return}Te=t=e}while(t!==null);Le===0&&(Le=5)}function dr(e,t,r){var n=se,o=ct.transition;try{ct.transition=null,se=1,id(e,t,r,n)}finally{ct.transition=o,se=n}return null}function id(e,t,r,n){do Vr();while(qt!==null);if((ne&6)!==0)throw Error(a(327));r=e.finishedWork;var o=e.finishedLanes;if(r===null)return null;if(e.finishedWork=null,e.finishedLanes=0,r===e.current)throw Error(a(177));e.callbackNode=null,e.callbackPriority=0;var l=r.lanes|r.childLanes;if(jc(e,l),e===Ne&&(Te=Ne=null,Me=0),(r.subtreeFlags&2064)===0&&(r.flags&2064)===0||Po||(Po=!0,Ku(Un,function(){return Vr(),null})),l=(r.flags&15990)!==0,(r.subtreeFlags&15990)!==0||l){l=ct.transition,ct.transition=null;var s=se;se=1;var c=ne;ne|=4,Pi.current=null,ed(e,r),Uu(r,e),Tf(jl),Gn=!!zl,jl=zl=null,e.current=r,td(r),Pc(),ne=c,se=s,ct.transition=l}else e.current=r;if(Po&&(Po=!1,qt=e,No=o),l=e.pendingLanes,l===0&&(Qt=null),Oc(r.stateNode),Xe(e,Ee()),t!==null)for(n=e.onRecoverableError,r=0;r<t.length;r++)o=t[r],n(o.value,{componentStack:o.stack,digest:o.digest});if(Ao)throw Ao=!1,e=Oi,Oi=null,e;return(No&1)!==0&&e.tag!==0&&Vr(),l=e.pendingLanes,(l&1)!==0?e===Fi?Ln++:(Ln=0,Fi=e):Ln=0,Wt(),null}function Vr(){if(qt!==null){var e=Ma(No),t=ct.transition,r=se;try{if(ct.transition=null,se=16>e?16:e,qt===null)var n=!1;else{if(e=qt,qt=null,No=0,(ne&6)!==0)throw Error(a(331));var o=ne;for(ne|=4,b=e.current;b!==null;){var l=b,s=l.child;if((b.flags&16)!==0){var c=l.deletions;if(c!==null){for(var d=0;d<c.length;d++){var _=c[d];for(b=_;b!==null;){var R=b;switch(R.tag){case 0:case 11:case 15:Cn(8,R,l)}var L=R.child;if(L!==null)L.return=R,b=L;else for(;b!==null;){R=b;var k=R.sibling,U=R.return;if(Du(R),R===_){b=null;break}if(k!==null){k.return=U,b=k;break}b=U}}}var V=l.alternate;if(V!==null){var G=V.child;if(G!==null){V.child=null;do{var ke=G.sibling;G.sibling=null,G=ke}while(G!==null)}}b=l}}if((l.subtreeFlags&2064)!==0&&s!==null)s.return=l,b=s;else e:for(;b!==null;){if(l=b,(l.flags&2048)!==0)switch(l.tag){case 0:case 11:case 15:Cn(9,l,l.return)}var v=l.sibling;if(v!==null){v.return=l.return,b=v;break e}b=l.return}}var p=e.current;for(b=p;b!==null;){s=b;var g=s.child;if((s.subtreeFlags&2064)!==0&&g!==null)g.return=s,b=g;else e:for(s=p;b!==null;){if(c=b,(c.flags&2048)!==0)try{switch(c.tag){case 0:case 11:case 15:To(9,c)}}catch(W){we(c,c.return,W)}if(c===s){b=null;break e}var P=c.sibling;if(P!==null){P.return=c.return,b=P;break e}b=c.return}}if(ne=o,Wt(),St&&typeof St.onPostCommitFiberRoot=="function")try{St.onPostCommitFiberRoot(zn,e)}catch{}n=!0}return n}finally{se=r,ct.transition=t}}return!1}function Xu(e,t,r){t=jr(r,t),t=du(e,t,1),e=$t(e,t,1),t=He(),e!==null&&(Kr(e,1,t),Xe(e,t))}function we(e,t,r){if(e.tag===3)Xu(e,e,r);else for(;t!==null;){if(t.tag===3){Xu(t,e,r);break}else if(t.tag===1){var n=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof n.componentDidCatch=="function"&&(Qt===null||!Qt.has(n))){e=jr(r,e),e=pu(t,e,1),t=$t(t,e,1),e=He(),t!==null&&(Kr(t,1,e),Xe(t,e));break}}t=t.return}}function ad(e,t,r){var n=e.pingCache;n!==null&&n.delete(t),t=He(),e.pingedLanes|=e.suspendedLanes&r,Ne===e&&(Me&r)===r&&(Le===4||Le===3&&(Me&130023424)===Me&&500>Ee()-Di?fr(e,0):Ni|=r),Xe(e,t)}function Qu(e,t){t===0&&((e.mode&1)===0?t=1:(t=bn,bn<<=1,(bn&130023424)===0&&(bn=4194304)));var r=He();e=Nt(e,t),e!==null&&(Kr(e,t,r),Xe(e,r))}function sd(e){var t=e.memoizedState,r=0;t!==null&&(r=t.retryLane),Qu(e,r)}function ud(e,t){var r=0;switch(e.tag){case 13:var n=e.stateNode,o=e.memoizedState;o!==null&&(r=o.retryLane);break;case 19:n=e.stateNode;break;default:throw Error(a(314))}n!==null&&n.delete(t),Qu(e,r)}var qu;qu=function(e,t,r){if(e!==null)if(e.memoizedProps!==t.pendingProps||Ge.current)Ye=!0;else{if((e.lanes&r)===0&&(t.flags&128)===0)return Ye=!1,qf(e,t,r);Ye=(e.flags&131072)!==0}else Ye=!1,ye&&(t.flags&1048576)!==0&&As(t,so,t.index);switch(t.lanes=0,t.tag){case 2:var n=t.type;ko(e,t),e=t.pendingProps;var o=Nr(t,Ue.current);Ur(t,r),o=ui(null,t,n,e,o,r);var l=ci();return t.flags|=1,typeof o=="object"&&o!==null&&typeof o.render=="function"&&o.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,We(n)?(l=!0,lo(t)):l=!1,t.memoizedState=o.state!==null&&o.state!==void 0?o.state:null,ri(t),o.updater=xo,t.stateNode=o,o._reactInternals=t,vi(t,n,e,r),t=Si(null,t,n,!0,l,r)):(t.tag=0,ye&&l&&Yl(t),Be(null,t,o,r),t=t.child),t;case 16:n=t.elementType;e:{switch(ko(e,t),e=t.pendingProps,o=n._init,n=o(n._payload),t.type=n,o=t.tag=fd(n),e=mt(n,e),o){case 0:t=_i(null,t,n,e,r);break e;case 1:t=xu(null,t,n,e,r);break e;case 11:t=gu(null,t,n,e,r);break e;case 14:t=yu(null,t,n,mt(n.type,e),r);break e}throw Error(a(306,n,""))}return t;case 0:return n=t.type,o=t.pendingProps,o=t.elementType===n?o:mt(n,o),_i(e,t,n,o,r);case 1:return n=t.type,o=t.pendingProps,o=t.elementType===n?o:mt(n,o),xu(e,t,n,o,r);case 3:e:{if(Eu(t),e===null)throw Error(a(387));n=t.pendingProps,l=t.memoizedState,o=l.element,zs(e,t),mo(t,n,null,r);var s=t.memoizedState;if(n=s.element,l.isDehydrated)if(l={element:n,isDehydrated:!1,cache:s.cache,pendingSuspenseBoundaries:s.pendingSuspenseBoundaries,transitions:s.transitions},t.updateQueue.baseState=l,t.memoizedState=l,t.flags&256){o=jr(Error(a(423)),t),t=ku(e,t,n,r,o);break e}else if(n!==o){o=jr(Error(a(424)),t),t=ku(e,t,n,r,o);break e}else for(ot=Ht(t.stateNode.containerInfo.firstChild),nt=t,ye=!0,ht=null,r=Is(t,null,n,r),t.child=r;r;)r.flags=r.flags&-3|4096,r=r.sibling;else{if(Fr(),n===o){t=Ot(e,t,r);break e}Be(e,t,n,r)}t=t.child}return t;case 5:return Bs(t),e===null&&Ql(t),n=t.type,o=t.pendingProps,l=e!==null?e.memoizedProps:null,s=o.children,bl(n,o)?s=null:l!==null&&bl(n,l)&&(t.flags|=32),wu(e,t),Be(e,t,s,r),t.child;case 6:return e===null&&Ql(t),null;case 13:return Cu(e,t,r);case 4:return ni(t,t.stateNode.containerInfo),n=t.pendingProps,e===null?t.child=Mr(t,null,n,r):Be(e,t,n,r),t.child;case 11:return n=t.type,o=t.pendingProps,o=t.elementType===n?o:mt(n,o),gu(e,t,n,o,r);case 7:return Be(e,t,t.pendingProps,r),t.child;case 8:return Be(e,t,t.pendingProps.children,r),t.child;case 12:return Be(e,t,t.pendingProps.children,r),t.child;case 10:e:{if(n=t.type._context,o=t.pendingProps,l=t.memoizedProps,s=o.value,fe(fo,n._currentValue),n._currentValue=s,l!==null)if(pt(l.value,s)){if(l.children===o.children&&!Ge.current){t=Ot(e,t,r);break e}}else for(l=t.child,l!==null&&(l.return=t);l!==null;){var c=l.dependencies;if(c!==null){s=l.child;for(var d=c.firstContext;d!==null;){if(d.context===n){if(l.tag===1){d=Dt(-1,r&-r),d.tag=2;var _=l.updateQueue;if(_!==null){_=_.shared;var R=_.pending;R===null?d.next=d:(d.next=R.next,R.next=d),_.pending=d}}l.lanes|=r,d=l.alternate,d!==null&&(d.lanes|=r),ei(l.return,r,t),c.lanes|=r;break}d=d.next}}else if(l.tag===10)s=l.type===t.type?null:l.child;else if(l.tag===18){if(s=l.return,s===null)throw Error(a(341));s.lanes|=r,c=s.alternate,c!==null&&(c.lanes|=r),ei(s,r,t),s=l.sibling}else s=l.child;if(s!==null)s.return=l;else for(s=l;s!==null;){if(s===t){s=null;break}if(l=s.sibling,l!==null){l.return=s.return,s=l;break}s=s.return}l=s}Be(e,t,o.children,r),t=t.child}return t;case 9:return o=t.type,n=t.pendingProps.children,Ur(t,r),o=st(o),n=n(o),t.flags|=1,Be(e,t,n,r),t.child;case 14:return n=t.type,o=mt(n,t.pendingProps),o=mt(n.type,o),yu(e,t,n,o,r);case 15:return _u(e,t,t.type,t.pendingProps,r);case 17:return n=t.type,o=t.pendingProps,o=t.elementType===n?o:mt(n,o),ko(e,t),t.tag=1,We(n)?(e=!0,lo(t)):e=!1,Ur(t,r),cu(t,n,o),vi(t,n,o,r),Si(null,t,n,!0,e,r);case 19:return Ru(e,t,r);case 22:return Su(e,t,r)}throw Error(a(156,t.tag))};function Ku(e,t){return Pa(e,t)}function cd(e,t,r,n){this.tag=e,this.key=r,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=n,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function ft(e,t,r,n){return new cd(e,t,r,n)}function bi(e){return e=e.prototype,!(!e||!e.isReactComponent)}function fd(e){if(typeof e=="function")return bi(e)?1:0;if(e!=null){if(e=e.$$typeof,e===Je)return 11;if(e===et)return 14}return 2}function Zt(e,t){var r=e.alternate;return r===null?(r=ft(e.tag,t,e.key,e.mode),r.elementType=e.elementType,r.type=e.type,r.stateNode=e.stateNode,r.alternate=e,e.alternate=r):(r.pendingProps=t,r.type=e.type,r.flags=0,r.subtreeFlags=0,r.deletions=null),r.flags=e.flags&14680064,r.childLanes=e.childLanes,r.lanes=e.lanes,r.child=e.child,r.memoizedProps=e.memoizedProps,r.memoizedState=e.memoizedState,r.updateQueue=e.updateQueue,t=e.dependencies,r.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},r.sibling=e.sibling,r.index=e.index,r.ref=e.ref,r}function Mo(e,t,r,n,o,l){var s=2;if(n=e,typeof e=="function")bi(e)&&(s=1);else if(typeof e=="string")s=5;else e:switch(e){case pe:return pr(r.children,o,l,t);case Ce:s=8,o|=8;break;case Ve:return e=ft(12,r,t,o|2),e.elementType=Ve,e.lanes=l,e;case Oe:return e=ft(13,r,t,o),e.elementType=Oe,e.lanes=l,e;case Ze:return e=ft(19,r,t,o),e.elementType=Ze,e.lanes=l,e;case he:return Io(r,o,l,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case qe:s=10;break e;case Ke:s=9;break e;case Je:s=11;break e;case et:s=14;break e;case Ie:s=16,n=null;break e}throw Error(a(130,e==null?e:typeof e,""))}return t=ft(s,r,t,o),t.elementType=e,t.type=n,t.lanes=l,t}function pr(e,t,r,n){return e=ft(7,e,n,t),e.lanes=r,e}function Io(e,t,r,n){return e=ft(22,e,n,t),e.elementType=he,e.lanes=r,e.stateNode={isHidden:!1},e}function Bi(e,t,r){return e=ft(6,e,null,t),e.lanes=r,e}function Hi(e,t,r){return t=ft(4,e.children!==null?e.children:[],e.key,t),t.lanes=r,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function dd(e,t,r,n,o){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=ml(0),this.expirationTimes=ml(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=ml(0),this.identifierPrefix=n,this.onRecoverableError=o,this.mutableSourceEagerHydrationData=null}function Vi(e,t,r,n,o,l,s,c,d){return e=new dd(e,t,r,c,d),t===1?(t=1,l===!0&&(t|=8)):t=0,l=ft(3,null,null,t),e.current=l,l.stateNode=e,l.memoizedState={element:n,isDehydrated:r,cache:null,transitions:null,pendingSuspenseBoundaries:null},ri(l),e}function pd(e,t,r){var n=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:ue,key:n==null?null:""+n,children:e,containerInfo:t,implementation:r}}function Ju(e){if(!e)return Gt;e=e._reactInternals;e:{if(tr(e)!==e||e.tag!==1)throw Error(a(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(We(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(a(171))}if(e.tag===1){var r=e.type;if(We(r))return Ts(e,r,t)}return t}function Zu(e,t,r,n,o,l,s,c,d){return e=Vi(r,n,!0,e,o,l,s,c,d),e.context=Ju(null),r=e.current,n=He(),o=Kt(r),l=Dt(n,o),l.callback=t??null,$t(r,l,o),e.current.lanes=o,Kr(e,o,n),Xe(e,n),e}function Uo(e,t,r,n){var o=t.current,l=He(),s=Kt(o);return r=Ju(r),t.context===null?t.context=r:t.pendingContext=r,t=Dt(l,s),t.payload={element:e},n=n===void 0?null:n,n!==null&&(t.callback=n),e=$t(o,t,s),e!==null&&(yt(e,o,s,l),ho(e,o,s)),s}function zo(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function ec(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var r=e.retryLane;e.retryLane=r!==0&&r<t?r:t}}function Gi(e,t){ec(e,t),(e=e.alternate)&&ec(e,t)}function hd(){return null}var tc=typeof reportError=="function"?reportError:function(e){console.error(e)};function Wi(e){this._internalRoot=e}jo.prototype.render=Wi.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(a(409));Uo(e,t,null,null)},jo.prototype.unmount=Wi.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;cr(function(){Uo(null,e,null,null)}),t[Rt]=null}};function jo(e){this._internalRoot=e}jo.prototype.unstable_scheduleHydration=function(e){if(e){var t=za();e={blockedOn:null,target:e,priority:t};for(var r=0;r<jt.length&&t!==0&&t<jt[r].priority;r++);jt.splice(r,0,e),r===0&&Ba(e)}};function Yi(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function bo(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function rc(){}function md(e,t,r,n,o){if(o){if(typeof n=="function"){var l=n;n=function(){var _=zo(s);l.call(_)}}var s=Zu(t,n,e,0,null,!1,!1,"",rc);return e._reactRootContainer=s,e[Rt]=s.current,dn(e.nodeType===8?e.parentNode:e),cr(),s}for(;o=e.lastChild;)e.removeChild(o);if(typeof n=="function"){var c=n;n=function(){var _=zo(d);c.call(_)}}var d=Vi(e,0,!1,null,null,!1,!1,"",rc);return e._reactRootContainer=d,e[Rt]=d.current,dn(e.nodeType===8?e.parentNode:e),cr(function(){Uo(t,d,r,n)}),d}function Bo(e,t,r,n,o){var l=r._reactRootContainer;if(l){var s=l;if(typeof o=="function"){var c=o;o=function(){var d=zo(s);c.call(d)}}Uo(t,s,e,o)}else s=md(r,t,e,o,n);return zo(s)}Ia=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var r=qr(t.pendingLanes);r!==0&&(vl(t,r|1),Xe(t,Ee()),(ne&6)===0&&(Hr=Ee()+500,Wt()))}break;case 13:cr(function(){var n=Nt(e,1);if(n!==null){var o=He();yt(n,e,1,o)}}),Gi(e,1)}},gl=function(e){if(e.tag===13){var t=Nt(e,134217728);if(t!==null){var r=He();yt(t,e,134217728,r)}Gi(e,134217728)}},Ua=function(e){if(e.tag===13){var t=Kt(e),r=Nt(e,t);if(r!==null){var n=He();yt(r,e,t,n)}Gi(e,t)}},za=function(){return se},ja=function(e,t){var r=se;try{return se=e,t()}finally{se=r}},ul=function(e,t,r){switch(t){case"input":if(tl(e,r),t=r.name,r.type==="radio"&&t!=null){for(r=e;r.parentNode;)r=r.parentNode;for(r=r.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<r.length;t++){var n=r[t];if(n!==e&&n.form===e.form){var o=no(n);if(!o)throw Error(a(90));ua(n),tl(n,o)}}}break;case"textarea":ha(e,r);break;case"select":t=r.value,t!=null&&_r(e,!!r.multiple,t,!1)}},Ea=Ui,ka=cr;var vd={usingClientEntryPoint:!1,Events:[mn,Ar,no,wa,xa,Ui]},An={findFiberByHostInstance:rr,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},gd={bundleType:An.bundleType,version:An.version,rendererPackageName:An.rendererPackageName,rendererConfig:An.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:H.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=La(e),e===null?null:e.stateNode},findFiberByHostInstance:An.findFiberByHostInstance||hd,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var Ho=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!Ho.isDisabled&&Ho.supportsFiber)try{zn=Ho.inject(gd),St=Ho}catch{}}return Qe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=vd,Qe.createPortal=function(e,t){var r=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Yi(t))throw Error(a(200));return pd(e,t,null,r)},Qe.createRoot=function(e,t){if(!Yi(e))throw Error(a(299));var r=!1,n="",o=tc;return t!=null&&(t.unstable_strictMode===!0&&(r=!0),t.identifierPrefix!==void 0&&(n=t.identifierPrefix),t.onRecoverableError!==void 0&&(o=t.onRecoverableError)),t=Vi(e,1,!1,null,null,r,!1,n,o),e[Rt]=t.current,dn(e.nodeType===8?e.parentNode:e),new Wi(t)},Qe.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(a(188)):(e=Object.keys(e).join(","),Error(a(268,e)));return e=La(t),e=e===null?null:e.stateNode,e},Qe.flushSync=function(e){return cr(e)},Qe.hydrate=function(e,t,r){if(!bo(t))throw Error(a(200));return Bo(null,e,t,!0,r)},Qe.hydrateRoot=function(e,t,r){if(!Yi(e))throw Error(a(405));var n=r!=null&&r.hydratedSources||null,o=!1,l="",s=tc;if(r!=null&&(r.unstable_strictMode===!0&&(o=!0),r.identifierPrefix!==void 0&&(l=r.identifierPrefix),r.onRecoverableError!==void 0&&(s=r.onRecoverableError)),t=Zu(t,null,e,1,r??null,o,!1,l,s),e[Rt]=t.current,dn(e),n)for(e=0;e<n.length;e++)r=n[e],o=r._getVersion,o=o(r._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[r,o]:t.mutableSourceEagerHydrationData.push(r,o);return new jo(t)},Qe.render=function(e,t,r){if(!bo(t))throw Error(a(200));return Bo(null,e,t,!1,r)},Qe.unmountComponentAtNode=function(e){if(!bo(e))throw Error(a(40));return e._reactRootContainer?(cr(function(){Bo(null,null,e,!1,function(){e._reactRootContainer=null,e[Rt]=null})}),!0):!1},Qe.unstable_batchedUpdates=Ui,Qe.unstable_renderSubtreeIntoContainer=function(e,t,r,n){if(!bo(r))throw Error(a(200));if(e==null||e._reactInternals===void 0)throw Error(a(38));return Bo(e,t,r,!1,n)},Qe.version="18.3.1-next-f1338f8080-20240426",Qe}var cc;function Ad(){if(cc)return Qi.exports;cc=1;function h(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(h)}catch(i){console.error(i)}}return h(),Qi.exports=Ld(),Qi.exports}var fc;function Pd(){if(fc)return Vo;fc=1;var h=Ad();return Vo.createRoot=h.createRoot,Vo.hydrateRoot=h.hydrateRoot,Vo}var Nd=Pd();const Dd=`#version 300 es

in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  // Map NDC [-1,1] to UV [0,1]
  v_uv = a_position * 0.5 + 0.5;
}
`,Od=new Float32Array([-1,-1,1,-1,-1,1,1,1]);class hr{constructor(i,a){M(this,"gl");M(this,"program");M(this,"vao");M(this,"uniformLocations",new Map);M(this,"_isReady",!1);this.gl=i,this.program=this.compileProgram(Dd,a),this.vao=this.createQuadVAO(),this._isReady=!0}get isReady(){return this._isReady}compileShader(i,a){const u=this.gl,f=u.createShader(a);if(!f)throw new Error("Failed to create shader");if(u.shaderSource(f,i),u.compileShader(f),!u.getShaderParameter(f,u.COMPILE_STATUS)){const y=u.getShaderInfoLog(f);throw u.deleteShader(f),new Error(`Shader compile error:
${y}`)}return f}compileProgram(i,a){const u=this.gl,f=this.compileShader(i,u.VERTEX_SHADER),y=this.compileShader(a,u.FRAGMENT_SHADER),w=u.createProgram();if(!w)throw new Error("Failed to create program");if(u.attachShader(w,f),u.attachShader(w,y),u.linkProgram(w),!u.getProgramParameter(w,u.LINK_STATUS)){const S=u.getProgramInfoLog(w);throw new Error(`Program link error:
${S}`)}return u.deleteShader(f),u.deleteShader(y),w}createQuadVAO(){const i=this.gl,a=i.createVertexArray();if(!a)throw new Error("Failed to create VAO");i.bindVertexArray(a);const u=i.createBuffer();i.bindBuffer(i.ARRAY_BUFFER,u),i.bufferData(i.ARRAY_BUFFER,Od,i.STATIC_DRAW);const f=i.getAttribLocation(this.program,"a_position");return i.enableVertexAttribArray(f),i.vertexAttribPointer(f,2,i.FLOAT,!1,0,0),i.bindVertexArray(null),a}use(){this.gl.useProgram(this.program)}loc(i){return this.uniformLocations.has(i)||this.uniformLocations.set(i,this.gl.getUniformLocation(this.program,i)),this.uniformLocations.get(i)}setUniforms(i){const a=this.gl;for(const[u,f]of Object.entries(i)){const y=this.loc(u);if(y!==null){if(typeof f=="number")a.uniform1f(y,f);else if(typeof f=="boolean")a.uniform1i(y,f?1:0);else if(Array.isArray(f))switch(f.length){case 2:a.uniform2fv(y,f);break;case 3:a.uniform3fv(y,f);break;case 4:a.uniform4fv(y,f);break;default:a.uniform1fv(y,f)}}}}setInt(i,a){const u=this.loc(i);u!==null&&this.gl.uniform1i(u,a)}bindTexture(i,a,u){const f=this.loc(i);f!==null&&(this.gl.activeTexture(this.gl.TEXTURE0+u),this.gl.bindTexture(this.gl.TEXTURE_2D,a),this.gl.uniform1i(f,u))}draw(){const i=this.gl;i.bindVertexArray(this.vao),i.drawArrays(i.TRIANGLE_STRIP,0,4),i.bindVertexArray(null)}dispose(){this.gl.deleteProgram(this.program)}}class dc{constructor(i){M(this,"texture");M(this,"framebuffer");M(this,"width",0);M(this,"height",0);M(this,"internalFormat");M(this,"pixelType");M(this,"textureFilter");this.gl=i;const a=!!i.getExtension("EXT_color_buffer_float"),u=!!i.getExtension("OES_texture_float_linear");this.internalFormat=a?i.RGBA16F:i.RGBA8,this.pixelType=a?i.HALF_FLOAT:i.UNSIGNED_BYTE,this.textureFilter=a&&!u?i.NEAREST:i.LINEAR;const f=i.createTexture(),y=i.createFramebuffer();if(!f||!y)throw new Error("Failed to allocate WebGL render target");this.texture=f,this.framebuffer=y,i.bindTexture(i.TEXTURE_2D,f),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,this.textureFilter),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,this.textureFilter),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.bindTexture(i.TEXTURE_2D,null)}resize(i,a){if(i===this.width&&a===this.height)return;this.width=Math.max(1,i),this.height=Math.max(1,a);const u=this.gl;if(u.bindTexture(u.TEXTURE_2D,this.texture),u.texImage2D(u.TEXTURE_2D,0,this.internalFormat,this.width,this.height,0,u.RGBA,this.pixelType,null),u.bindFramebuffer(u.FRAMEBUFFER,this.framebuffer),u.framebufferTexture2D(u.FRAMEBUFFER,u.COLOR_ATTACHMENT0,u.TEXTURE_2D,this.texture,0),u.checkFramebufferStatus(u.FRAMEBUFFER)!==u.FRAMEBUFFER_COMPLETE)throw new Error("Optical thickness framebuffer is incomplete");u.bindFramebuffer(u.FRAMEBUFFER,null),u.bindTexture(u.TEXTURE_2D,null)}bind(){this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.framebuffer),this.gl.viewport(0,0,this.width,this.height)}unbind(i,a){this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.viewport(0,0,i,a)}dispose(){this.gl.deleteFramebuffer(this.framebuffer),this.gl.deleteTexture(this.texture)}}class Fd{constructor(i){M(this,"texture");M(this,"hasSource",!1);this.gl=i;const a=i.createTexture();if(!a)throw new Error("Failed to allocate scene texture");this.texture=a,i.bindTexture(i.TEXTURE_2D,a),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,new Uint8Array([10,13,18,255])),i.bindTexture(i.TEXTURE_2D,null)}setSource(i){if(this.hasSource=!!i,!i)return;const a=this.gl;a.bindTexture(a.TEXTURE_2D,this.texture),a.pixelStorei(a.UNPACK_FLIP_Y_WEBGL,1),a.pixelStorei(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,i),a.pixelStorei(a.UNPACK_FLIP_Y_WEBGL,0),a.bindTexture(a.TEXTURE_2D,null)}dispose(){this.gl.deleteTexture(this.texture)}}function Ji(h){const i=h/255;return i<=.04045?i/12.92:Math.pow((i+.055)/1.055,2.4)}function ee(h,i,a){return[Ji(h),Ji(i),Ji(a)]}const Ae={coreWhite:ee(220,235,255),coreGlowCool:ee(180,210,255),coreGlowWarm:ee(230,220,255),glassPrimary:ee(139,180,208),specularKey:ee(245,250,255),rimCool:ee(200,222,255),rimWarm:ee(220,200,255),bloomPool:ee(26,58,92),bloomListening:ee(20,60,110),bloomSpeaking:ee(40,30,80),rippleRing:ee(200,220,245),accentSuccess:ee(140,220,180),accentError:ee(240,130,110),accentThinking:ee(100,160,230),accentSleeping:ee(160,150,190)},Qo={idle:{coreColor:Ae.coreGlowCool,glassColor:Ae.glassPrimary,rimColor:Ae.rimCool,bloomColor:Ae.bloomPool,specularColor:Ae.specularKey,rippleColor:Ae.rippleRing},listening:{coreColor:Ae.coreWhite,glassColor:ee(120,170,220),rimColor:Ae.rimCool,bloomColor:Ae.bloomListening,specularColor:Ae.specularKey,rippleColor:Ae.rippleRing},thinking:{coreColor:Ae.accentThinking,glassColor:ee(100,140,190),rimColor:ee(160,190,240),bloomColor:ee(15,40,80),specularColor:ee(180,210,255),rippleColor:ee(160,190,220)},speaking:{coreColor:Ae.coreGlowWarm,glassColor:ee(155,175,220),rimColor:Ae.rimWarm,bloomColor:Ae.bloomSpeaking,specularColor:Ae.specularKey,rippleColor:ee(210,205,240)},success:{coreColor:Ae.accentSuccess,glassColor:ee(130,190,170),rimColor:ee(160,230,200),bloomColor:ee(10,40,30),specularColor:ee(200,245,230),rippleColor:ee(180,230,210)},error:{coreColor:Ae.accentError,glassColor:ee(200,140,130),rimColor:ee(240,170,160),bloomColor:ee(50,15,15),specularColor:ee(255,220,215),rippleColor:ee(240,190,185)},sleeping:{coreColor:Ae.accentSleeping,glassColor:ee(90,85,110),rimColor:ee(130,125,160),bloomColor:ee(15,12,22),specularColor:ee(170,165,200),rippleColor:ee(140,135,170)}},Ct={normalizedRadius:.36,coreGlowRatio:.34,keyHighlightRatio:.2,secondaryHighlightRatio:.14,bloomRadius:2.2,rippleRingSpacing:.28,rippleRingCount:4,shadowOffsetY:1.08,shadowSpread:.9},Zi={lowFreqAmplitude:.07,midFreqAmplitude:.035,highFreqAmplitude:.012},_t={absorption:[.55,.34,.18],opticalDensity:1.12,scattering:.42,causticStrength:.5,sceneTransmission:.7,pearlDensity:.8,pearlScatter:.7,pearlIridescence:.16,smokeDensity:.5,internalBloom:.42,shellReflectivity:.96},Tt={refractionStrength:.08,fresnelExponent:3.5,fresnelStrength:.72,transparency:.92,specularExponent:48,specularIntensity:.9,subsurfaceDepth:.6,edgeSoftness:.003,chromaticAberration:.015},vc={idle:{},listening:{transparency:.03,specularIntensity:.1,fresnelStrength:.05},thinking:{transparency:-.08,ior:.08,refractionIndex:.08,specularExponent:16},speaking:{specularIntensity:.2,fresnelStrength:.1,subsurfaceDepth:.15},success:{transparency:.02,specularIntensity:.05},error:{ior:-.05,transparency:-.1},sleeping:{transparency:-.2,specularIntensity:-.4,fresnelStrength:-.25}},qo={idle:{key:{position:[-.3,.7],intensity:.9,temperature:.25,specular:!0,specularExp:0},fill:{position:[.6,-.2],intensity:.22,temperature:.5,specular:!1,specularExp:0},rim:{position:[0,-1.4],intensity:.15,temperature:.3,specular:!1,specularExp:0},bloom:.45,bloomRadius:1},listening:{key:{position:[-.1,.8],intensity:.95,temperature:.2,specular:!0,specularExp:0},fill:{position:[.5,.1],intensity:.3,temperature:.4,specular:!1,specularExp:0},rim:{position:[0,-1.2],intensity:.1,temperature:.25,specular:!1,specularExp:0},bloom:.55,bloomRadius:1.15},thinking:{key:{position:[-.4,.5],intensity:.7,temperature:.15,specular:!0,specularExp:18},fill:{position:[.5,-.3],intensity:.15,temperature:.3,specular:!1,specularExp:0},rim:{position:[0,-1.6],intensity:.35,temperature:.2,specular:!1,specularExp:0},bloom:.3,bloomRadius:.85},speaking:{key:{position:[-.2,.6],intensity:1,temperature:.6,specular:!0,specularExp:0},fill:{position:[.5,.2],intensity:.35,temperature:.65,specular:!1,specularExp:0},rim:{position:[0,-1.3],intensity:.2,temperature:.55,specular:!1,specularExp:0},bloom:.7,bloomRadius:1.3},success:{key:{position:[-.2,.75],intensity:.88,temperature:.55,specular:!0,specularExp:0},fill:{position:[.55,0],intensity:.28,temperature:.5,specular:!1,specularExp:0},rim:{position:[0,-1.3],intensity:.22,temperature:.4,specular:!1,specularExp:0},bloom:.6,bloomRadius:1.2},error:{key:{position:[-.5,.4],intensity:.8,temperature:.1,specular:!0,specularExp:16},fill:{position:[.6,-.3],intensity:.12,temperature:.2,specular:!1,specularExp:0},rim:{position:[0,-1.5],intensity:.4,temperature:.15,specular:!1,specularExp:0},bloom:.25,bloomRadius:.75},sleeping:{key:{position:[-.2,.6],intensity:.3,temperature:.55,specular:!0,specularExp:6},fill:{position:[.5,-.2],intensity:.08,temperature:.5,specular:!1,specularExp:0},rim:{position:[0,-1.3],intensity:.06,temperature:.45,specular:!1,specularExp:0},bloom:.1,bloomRadius:.65}},gc={id:"luca-prime",name:"Luca Prime",shape:{organicAsymmetry:.25,surfaceTension:.85,baseScale:1},motion:{breathingPeriod:4.2,floatAmplitude:4,microJitterFrequency:3.7,responsivenessLag:.12},highlight:{driftPeriod:18,specularSharpness:1,highlightCount:2},timing:{anticipationDuration:.18,settleDuration:.45},breathing:{inhaleRatio:1.15,deepBreathScale:1.04}};function Md(h="idle",i=.42,a=1){const u=Qo[h]??Qo.idle,f=vc[h]??{},y=qo[h]??qo.idle;return{orbRadius:i,lowFreqAmp:Zi.lowFreqAmplitude,midFreqAmp:Zi.midFreqAmplitude,highFreqAmp:Zi.highFreqAmplitude,refractionStrength:Tt.refractionStrength+(f.refractionStrength??0),fresnelExponent:Tt.fresnelExponent+(f.refractionIndex??0)*2,fresnelStrength:Tt.fresnelStrength+(f.fresnelStrength??0),transparency:Tt.transparency+(f.transparency??0),specularExponent:Tt.specularExponent+(f.specularExponent??0),specularIntensity:Tt.specularIntensity+(f.specularIntensity??0),subsurfaceDepth:Tt.subsurfaceDepth+(f.subsurfaceDepth??0),edgeSoftness:Tt.edgeSoftness,chromaticAberration:Tt.chromaticAberration,glassColor:u.glassColor,rimColor:u.rimColor,coreColor:u.coreColor,specularColor:u.specularColor,bloomColor:u.bloomColor,rippleColor:u.rippleColor,keyLightPos:y.key.position,keyLightIntensity:y.key.intensity,fillLightPos:y.fill.position,fillLightIntensity:y.fill.intensity,bloomIntensity:y.bloom,bloomRadius:y.bloomRadius*Ct.bloomRadius,coreIntensity:.58,coreRadius:Ct.coreGlowRatio,coronaIntensity:.2,coronaRadius:Ct.coreGlowRatio*1.8,keyHighlightSize:Ct.keyHighlightRatio*1.1,secondaryHighlightSize:Ct.secondaryHighlightRatio,secondaryHighlightIntensity:y.key.intensity*.25,shadowOffsetY:Ct.shadowOffsetY,shadowSpreadX:Ct.shadowSpread*1.2,shadowSpreadY:.25,shadowOpacity:.3,rippleOpacity:.25,rippleCount:Ct.rippleRingCount,rippleSpacing:Ct.rippleRingSpacing}}const Id=Object.freeze([1.11,1.12,1.13,1.1,1.02,.9,.82,.78,.79,.86,.95,1.05,1.14,1.18,1.18,1.15,1.1,1.03,.96,.91,.88,.88,.92,.98,1.05,1.09,1.12,1.14,1.16,1.15,1.14,1.12]),Ud=Object.freeze([.98,1.015,1.03,1,.95,.93,.95,.995,1.035,1.065,1.08,1.07,1.035,1,.975,.97]),gr=Object.freeze({id:"luca-living-orb/product-master",version:2,sourceSha256:"4841901ECD4222760D8E532671DA493066A82CE2CCEE4AC0CA35054AF0CA074A",outer:Object.freeze({radiusSamples:Id,rotation:-.035,center:Object.freeze([.005,-.02])}),innerLobe:Object.freeze({radiusSamples:Ud,rotation:-.16,center:Object.freeze([-.065,-.035]),axes:Object.freeze([.76,.79])}),depth:Object.freeze({maxHalfDepth:.92,radialExponent:1.72,shoulderExponent:.58,frontScale:1,rearScale:.86,tilt:Object.freeze([-.08,.055])})}),Go=Math.PI*2;function Wo(h,i){return(h%i+i)%i}function Zo(h,i){const a=h.radiusSamples.length;if(a<4)throw new Error("Orb contours require at least four radial samples.");const f=((i-h.rotation)%Go+Go)%Go/Go*a,y=Math.floor(f),w=f-y,S=h.radiusSamples[Wo(y-1,a)],C=h.radiusSamples[Wo(y,a)],E=h.radiusSamples[Wo(y+1,a)],A=h.radiusSamples[Wo(y+2,a)];return .5*(2*C+(-S+E)*w+(2*S-5*C+4*E-A)*w*w+(-S+3*C-3*E+A)*w*w*w)}function yr(h,i,a){const u=Math.min(1,Math.max(0,i)),f=Math.pow(Math.max(0,1-Math.pow(u,h.radialExponent)),h.shoulderExponent),y=Math.min(1.18,Math.max(.82,1+a[0]*h.tilt[0]+a[1]*h.tilt[1]));return h.maxHalfDepth*f*y}const ea=(h,i,a,u,f)=>Object.freeze({id:h,kind:i,controlPoints:Object.freeze(a.map(y=>Object.freeze(y))),widthSamples:Object.freeze([...u]),material:Object.freeze(f)}),vr=Object.freeze({id:"luca-living-orb/hero-assembly",version:3,sourceSha256:gr.sourceSha256,reference:Object.freeze({sourceSize:Object.freeze([1536,1024]),cropPixels:Object.freeze([400,86,360,360]),outputSize:360,exposure:1,focalPointPixels:Object.freeze([580,266])}),outerShell:gr,innerPearl:Object.freeze({contour:Object.freeze({radiusSamples:Object.freeze([.8,.825,.885,.985,1.105,1.205,1.24,1.205,1.135,1.08,1.105,1.165,1.185,1.13,1.03,.925,.85,.8,.77,.77]),rotation:-.18,center:Object.freeze([-.075,-.025]),axes:Object.freeze([.73,.62])}),depth:Object.freeze({maxHalfDepth:.7,radialExponent:1.46,shoulderExponent:.68,frontScale:.88,rearScale:.62,tilt:Object.freeze([-.13,.11])})}),surfaces:Object.freeze([ea("crown-upper-left","crown-sheet",[[-.84,.29,.58],[-.69,.61,.7],[-.4,.86,.79],[-.05,.82,.82],[.29,.67,.77],[.53,.49,.67],[.68,.29,.57]],[.045,.085,.125,.12,.09,.055,.02],{color:[.82,.88,.96],opacity:.22,edgeGain:.72,centerShade:.58,thickness:.055,curvature:.64,roughness:.28}),ea("fold-lower-left","lower-fold",[[-.7,-.28,.68],[-.58,-.49,.76],[-.36,-.67,.83],[-.04,-.79,.85],[.28,-.75,.8],[.5,-.58,.69],[.6,-.4,.59]],[.022,.055,.095,.115,.085,.045,.018],{color:[.68,.77,.89],opacity:.29,edgeGain:.92,centerShade:.52,thickness:.078,curvature:.82,roughness:.34}),ea("ribbon-right-return","reflection-ribbon",[[.28,.65,.88],[.5,.52,.91],[.68,.33,.89],[.75,.09,.85],[.69,-.13,.8],[.57,-.3,.73]],[.008,.017,.026,.024,.016,.007],{color:[.78,.88,1],opacity:.18,edgeGain:1.12,centerShade:.76,thickness:.032,curvature:.54,roughness:.18})]),landmarks:Object.freeze([Object.freeze({id:"silhouette-top",point:Object.freeze([-.31,.94]),tolerancePixels:2}),Object.freeze({id:"silhouette-right",point:Object.freeze([1.1,.05]),tolerancePixels:2}),Object.freeze({id:"silhouette-bottom",point:Object.freeze([.16,-1.05]),tolerancePixels:2}),Object.freeze({id:"crown-apex",point:Object.freeze([-.4,.86]),tolerancePixels:3}),Object.freeze({id:"fold-apex",point:Object.freeze([-.1,-.78]),tolerancePixels:3}),Object.freeze({id:"ribbon-turn",point:Object.freeze([.75,.09]),tolerancePixels:3})])}),Yo=Object.freeze({id:"luca-living-orb/hero-blueprint",version:1,viewBox:Object.freeze([0,0,360,360]),layers:Object.freeze([Object.freeze({id:"outer-silhouette",label:"Outer membrane silhouette",closed:!0,path:"M 172 64 C 198 63 218 72 238 83 C 260 91 287 98 305 116 C 322 133 322 155 316 176 C 310 198 294 217 281 239 C 266 264 244 280 216 286 C 186 292 163 285 139 271 C 116 257 88 251 70 233 C 54 217 49 194 53 174 C 57 151 71 130 86 110 C 101 90 121 75 143 68 C 153 65 162 64 172 64 Z"}),Object.freeze({id:"crown-edge",label:"Upper crown overlap",closed:!1,path:"M 61 155 C 68 132 82 107 101 89 C 119 72 141 64 163 64 C 187 64 205 71 224 81 C 245 91 263 91 281 101 C 294 108 304 118 311 130"}),Object.freeze({id:"lower-fold",label:"Lower forward fold",closed:!1,path:"M 56 200 C 61 220 75 235 96 245 C 116 255 130 258 146 270 C 163 282 184 289 207 287 C 235 285 256 273 270 253 C 279 241 285 225 295 211"}),Object.freeze({id:"right-return",label:"Right membrane return",closed:!1,path:"M 280 101 C 300 109 314 126 317 145 C 321 165 313 184 302 201 C 290 220 281 239 268 255"}),Object.freeze({id:"inner-mass",label:"Suspended inner mass",closed:!0,path:"M 171 78 C 202 76 224 87 249 96 C 275 103 299 113 307 134 C 317 158 304 181 289 201 C 275 221 270 244 251 260 C 232 276 207 281 183 276 C 159 272 144 261 124 253 C 101 244 78 232 68 212 C 57 189 64 166 78 145 C 92 123 105 101 128 88 C 141 81 156 78 171 78 Z"})]),landmarks:Object.freeze([Object.freeze({id:"crown-apex",x:172,y:64}),Object.freeze({id:"rightmost-return",x:318,y:151}),Object.freeze({id:"lower-fold-apex",x:207,y:287}),Object.freeze({id:"leftmost-membrane",x:52,y:184}),Object.freeze({id:"inner-mass-focus",x:177,y:179})])}),zd=48,jd=128,bd=Math.PI*2;function Bd(h=gr,i=zd,a=jd){if(i<2)throw new Error("Canonical volume mesh requires at least two radial rings.");if(a<12)throw new Error("Canonical volume mesh requires at least twelve angle segments.");const u=[],f=[],y=1+i*a;for(const w of[1,-1]){const S=u.length/4,C=h.outer.center,A=yr(h.depth,0,C)*(w>0?h.depth.frontScale:-h.depth.rearScale);u.push(C[0],C[1],A,w);for(let D=1;D<=i;D+=1){const B=D/i;for(let z=0;z<a;z+=1){const I=z/a*bd,O=Zo(h.outer,I),q=C[0]+Math.cos(I)*O*B,K=C[1]+Math.sin(I)*O*B,H=yr(h.depth,B,[q,K])*(w>0?h.depth.frontScale:-h.depth.rearScale);u.push(q,K,H,w)}}const N=S+1;for(let D=0;D<a;D+=1){const B=(D+1)%a;f.push(S,N+D,N+B)}for(let D=1;D<i;D+=1){const B=S+1+(D-1)*a,z=B+a;for(let I=0;I<a;I+=1){const O=(I+1)%a;f.push(B+I,z+I,z+O,B+I,z+O,B+O)}}if(u.length/4!==S+y)throw new Error("Canonical volume mesh vertex layout is inconsistent.")}if(u.length/4>65535)throw new Error("Canonical volume mesh exceeds the 16-bit index envelope.");return{vertices:new Float32Array(u),indices:new Uint16Array(f),vertexCount:u.length/4,triangleCount:f.length/3}}const Hd=`#version 300 es
precision highp float;

in vec3 a_position;
in float a_surface;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_breathingScale;

out float v_depth;
flat out float v_surface;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 scaledLocal = a_position.xy * u_radius * u_breathingScale;
  vec2 uv = u_center + vec2(scaledLocal.x / aspect, scaledLocal.y);
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  v_depth = clamp(0.5 + a_position.z * 0.5, 0.0, 1.0);
  v_surface = a_surface;
}
`,Vd=`#version 300 es
precision highp float;

in float v_depth;
flat in float v_surface;
out vec4 fragColor;

void main() {
  // R/G contain independently rasterized front/rear depth. B/A carry their
  // coverage so the consumer can reject incomplete path-length samples.
  fragColor = v_surface > 0.0
    ? vec4(v_depth, 0.0, 1.0, 0.0)
    : vec4(0.0, v_depth, 0.0, 1.0);
}
`;class Gd{constructor(i){M(this,"program");M(this,"vao");M(this,"vertexBuffer");M(this,"indexBuffer");M(this,"indexCountPerSurface");M(this,"uniformLocations",new Map);this.gl=i;const a=Bd();this.indexCountPerSurface=a.indices.length/2;const u=this.createProgram(Hd,Vd),f=i.createVertexArray(),y=i.createBuffer(),w=i.createBuffer();if(!f||!y||!w)throw new Error("Failed to allocate canonical volume mesh.");this.program=u,this.vao=f,this.vertexBuffer=y,this.indexBuffer=w,i.bindVertexArray(f),i.bindBuffer(i.ARRAY_BUFFER,y),i.bufferData(i.ARRAY_BUFFER,a.vertices,i.STATIC_DRAW),i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,w),i.bufferData(i.ELEMENT_ARRAY_BUFFER,a.indices,i.STATIC_DRAW);const S=4*Float32Array.BYTES_PER_ELEMENT,C=i.getAttribLocation(u,"a_position"),E=i.getAttribLocation(u,"a_surface");i.enableVertexAttribArray(C),i.vertexAttribPointer(C,3,i.FLOAT,!1,S,0),i.enableVertexAttribArray(E),i.vertexAttribPointer(E,1,i.FLOAT,!1,S,3*Float32Array.BYTES_PER_ELEMENT),i.bindVertexArray(null)}draw(i){const a=this.gl;a.useProgram(this.program);for(const[u,f]of Object.entries(i)){const y=this.loc(u);y!==null&&(typeof f=="number"?a.uniform1f(y,f):f.length===2&&a.uniform2fv(y,f))}a.bindVertexArray(this.vao),a.disable(a.BLEND),a.colorMask(!0,!1,!0,!1),a.drawElements(a.TRIANGLES,this.indexCountPerSurface,a.UNSIGNED_SHORT,0),a.colorMask(!1,!0,!1,!0),a.drawElements(a.TRIANGLES,this.indexCountPerSurface,a.UNSIGNED_SHORT,this.indexCountPerSurface*Uint16Array.BYTES_PER_ELEMENT),a.colorMask(!0,!0,!0,!0),a.bindVertexArray(null)}dispose(){const i=this.gl;i.deleteBuffer(this.vertexBuffer),i.deleteBuffer(this.indexBuffer),i.deleteVertexArray(this.vao),i.deleteProgram(this.program)}loc(i){return this.uniformLocations.has(i)||this.uniformLocations.set(i,this.gl.getUniformLocation(this.program,i)),this.uniformLocations.get(i)}createProgram(i,a){const u=this.gl,f=(C,E)=>{const A=u.createShader(E);if(!A)throw new Error("Failed to create canonical volume shader.");if(u.shaderSource(A,C),u.compileShader(A),!u.getShaderParameter(A,u.COMPILE_STATUS)){const N=u.getShaderInfoLog(A);throw u.deleteShader(A),new Error(`Canonical volume shader compile error:
${N}`)}return A},y=f(i,u.VERTEX_SHADER),w=f(a,u.FRAGMENT_SHADER),S=u.createProgram();if(!S)throw new Error("Failed to create canonical volume program.");if(u.attachShader(S,y),u.attachShader(S,w),u.linkProgram(S),u.deleteShader(y),u.deleteShader(w),!u.getProgramParameter(S,u.LINK_STATUS)){const C=u.getProgramInfoLog(S);throw u.deleteProgram(S),new Error(`Canonical volume program link error:
${C}`)}return S}}const $o=18,Wd=48,Yd=10;function Ko(h,i){return Math.min(i-1,Math.max(0,h))}function Xo(h,i,a,u,f){const y=f*f,w=y*f;return .5*(2*i+(-h+a)*f+(2*h-5*i+4*a-u)*y+(-h+3*i-3*a+u)*w)}function ta(h,i){const a=Math.min(1,Math.max(0,i))*(h.length-1),u=Math.min(h.length-2,Math.floor(a)),f=a-u,y=h[Ko(u-1,h.length)],w=h[u],S=h[u+1],C=h[Ko(u+2,h.length)];return[Xo(y[0],w[0],S[0],C[0],f),Xo(y[1],w[1],S[1],C[1],f),Xo(y[2],w[2],S[2],C[2],f)]}function $d(h,i){const a=Math.min(1,Math.max(0,i))*(h.length-1),u=Math.min(h.length-2,Math.floor(a)),f=a-u;return Xo(h[Ko(u-1,h.length)],h[u],h[u+1],h[Ko(u+2,h.length)],f)}function Xd(h){switch(h.kind){case"crown-sheet":return 0;case"lower-fold":return 1;case"reflection-ribbon":return 2}}function yc(h=vr,i=Wd,a=Yd){if(i<4)throw new Error("Hero surfaces require at least four curve segments.");if(a<4||a%2!==0)throw new Error("Hero surfaces require an even cross-section of at least four segments.");const u=[],f=[],y=[];for(const w of h.surfaces){const S=u.length/$o,C=f.length,E=Xd(w);for(let A=0;A<=i;A+=1){const N=A/i,D=ta(w.controlPoints,N),B=1/i,z=ta(w.controlPoints,Math.max(0,N-B)),I=ta(w.controlPoints,Math.min(1,N+B)),O=I[0]-z[0],q=I[1]-z[1],K=Math.hypot(O,q)||1,re=-q/K,H=O/K,de=Math.max(.001,$d(w.widthSamples,N)*.5);for(let ue=0;ue<=a;ue+=1){const pe=ue/a*2-1,{color:Ce,opacity:Ve,edgeGain:qe,centerShade:Ke,thickness:Je,curvature:Oe,roughness:Ze}=w.material,et=pe*Math.PI*.5,Ie=Math.cos(et)*Je*Oe,he=-Math.sin(et)*Oe,F=Math.hypot(he,1),Y=-he/F,j=1/F;u.push(D[0]+re*de*pe,D[1]+H*de*pe,D[2]+Ie,pe,N,E,Ce[0],Ce[1],Ce[2],Ve,qe,Ke,re*Y,H*Y,j,Je,Ze,Oe)}}for(let A=0;A<i;A+=1){const N=S+A*(a+1),D=N+a+1;for(let B=0;B<a;B+=1)f.push(N+B,N+B+1,D+B+1,N+B,D+B+1,D+B)}y.push(Object.freeze({id:w.id,firstIndex:C,indexCount:f.length-C}))}if(u.length/$o>65535)throw new Error("Hero surface mesh exceeds the 16-bit index envelope.");return{vertices:new Float32Array(u),indices:new Uint16Array(f),ranges:Object.freeze(y),vertexCount:u.length/$o,triangleCount:f.length/3}}const Qd=`#version 300 es
precision highp float;

in vec3 a_position;
in vec2 a_surfaceUv;
in float a_kind;
in vec3 a_color;
in vec3 a_material;
in vec3 a_normal;
in vec3 a_optics;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_breathingScale;
uniform float u_time;
uniform float u_audioEnergy;

out vec2 v_surfaceUv;
out float v_kind;
out float v_depth;
out vec3 v_color;
out vec3 v_material;
out vec3 v_normal;
out vec3 v_optics;
out vec2 v_screenUv;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  float livingEnergy = sin(u_time * 0.42 + a_surfaceUv.y * 2.4) * 0.002
    + u_audioEnergy * 0.004;
  vec2 local = a_position.xy * (1.0 + livingEnergy);
  vec2 uv = u_center + vec2(
    local.x * u_radius * u_breathingScale / aspect,
    local.y * u_radius * u_breathingScale
  );
  gl_Position = vec4(uv * 2.0 - 1.0, a_position.z * 0.01, 1.0);
  v_surfaceUv = a_surfaceUv;
  v_kind = a_kind;
  v_depth = a_position.z;
  v_color = a_color;
  v_material = a_material;
  v_normal = normalize(a_normal);
  v_optics = a_optics;
  v_screenUv = uv;
}
`,qd=`#version 300 es
precision highp float;

in vec2 v_surfaceUv;
in float v_kind;
in float v_depth;
in vec3 v_color;
in vec3 v_material;
in vec3 v_normal;
in vec3 v_optics;
in vec2 v_screenUv;
uniform sampler2D u_thicknessMap;
uniform sampler2D u_pearlDepthMap;
uniform vec2 u_keyLightDirection;
uniform vec3 u_keyLightColor;
uniform float u_structureMode;
out vec4 fragColor;

void main() {
  float across = abs(v_surfaceUv.x);
  float edgeFeather = 1.0 - smoothstep(0.90, 1.0, across);
  float endFeather = smoothstep(0.0, 0.055, v_surfaceUv.y)
    * smoothstep(0.0, 0.075, 1.0 - v_surfaceUv.y);
  vec4 shellSample = texture(u_thicknessMap, v_screenUv);
  float shellThickness = max(shellSample.r - shellSample.g, 0.0)
    * min(shellSample.b, shellSample.a);
  float shellCoverage = smoothstep(0.015, 0.10, shellThickness);
  if (shellCoverage <= 0.001) discard;
  vec4 pearlSample = texture(u_pearlDepthMap, v_screenUv);
  float pearlFront = pearlSample.r;
  float surfaceDepth = 0.5 + v_depth * 0.5;
  float pearlSeparation = pearlSample.b < 0.5
    ? 1.0
    : smoothstep(-0.018, 0.035, surfaceDepth - pearlFront);

  if (u_structureMode > 0.5) {
    vec3 diagnosticColor = v_kind < 0.5
      ? vec3(0.70, 0.72, 0.76)
      : v_kind < 1.5
        ? vec3(0.43, 0.45, 0.49)
        : vec3(0.82, 0.84, 0.87);
    float diagnosticAlpha = (0.48 + across * 0.18)
      * edgeFeather * endFeather * shellCoverage
      * mix(0.58, 1.0, pearlSeparation);
    fragColor = vec4(diagnosticColor * diagnosticAlpha, diagnosticAlpha);
    return;
  }

  vec3 normal = normalize(v_normal);
  vec3 lightDirection = normalize(vec3(u_keyLightDirection, 0.78));
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  vec3 halfDirection = normalize(lightDirection + viewDirection);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.4);
  float specularExponent = mix(92.0, 20.0, v_optics.y);
  float specular = pow(max(dot(normal, halfDirection), 0.0), specularExponent);
  float edgeLight = fresnel * v_material.y;
  float centreTone = mix(v_material.z, 1.0, diffuse);
  float depthLight = mix(0.70, 1.05, v_depth);
  float opticalPath = v_optics.x / max(normal.z, 0.25);
  float transmission = exp(-opticalPath * mix(5.5, 2.8, diffuse));

  float crownVeil = 1.0;
  if (v_kind < 0.5) {
    crownVeil = 0.66 + 0.34 * smoothstep(0.0, 0.48, v_surfaceUv.y);
  } else if (v_kind < 1.5) {
    float foldTrough = exp(-pow(v_surfaceUv.x * 2.4, 2.0));
    centreTone *= mix(1.0, 0.82, foldTrough);
    edgeLight *= 1.18;
  } else {
    centreTone = 0.62 + diffuse * 0.30 + across * 0.18;
    edgeLight *= 1.32;
  }

  float alpha = v_material.x * (1.0 - transmission) * 2.0
    * edgeFeather * endFeather * crownVeil * shellCoverage
    * mix(0.42, 1.0, pearlSeparation);
  alpha = clamp(alpha, 0.0, 0.34);
  vec3 subsurface = mix(v_color * 0.60, v_color, transmission);
  vec3 color = subsurface * centreTone * depthLight;
  color += u_keyLightColor * (specular * 0.72 + edgeLight * 0.34);
  color += vec3(0.08, 0.13, 0.20) * shellThickness * (1.0 - transmission);
  fragColor = vec4(color * alpha, alpha);
}
`;class Kd{constructor(i){M(this,"program");M(this,"vao");M(this,"vertexBuffer");M(this,"indexBuffer");M(this,"indexCount");M(this,"uniformLocations",new Map);this.gl=i;const a=yc(),u=this.createProgram(Qd,qd),f=i.createVertexArray(),y=i.createBuffer(),w=i.createBuffer();if(!f||!y||!w)throw new Error("Failed to allocate hero surface mesh.");this.program=u,this.vao=f,this.vertexBuffer=y,this.indexBuffer=w,this.indexCount=a.indices.length,i.bindVertexArray(f),i.bindBuffer(i.ARRAY_BUFFER,y),i.bufferData(i.ARRAY_BUFFER,a.vertices,i.STATIC_DRAW),i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,w),i.bufferData(i.ELEMENT_ARRAY_BUFFER,a.indices,i.STATIC_DRAW);const S=$o*Float32Array.BYTES_PER_ELEMENT;this.bindAttribute(u,"a_position",3,S,0),this.bindAttribute(u,"a_surfaceUv",2,S,3),this.bindAttribute(u,"a_kind",1,S,5),this.bindAttribute(u,"a_color",3,S,6),this.bindAttribute(u,"a_material",3,S,9),this.bindAttribute(u,"a_normal",3,S,12),this.bindAttribute(u,"a_optics",3,S,15),i.bindVertexArray(null)}draw(i){const a=this.gl;a.useProgram(this.program);for(const[u,f]of Object.entries(i)){const y=this.loc(u);y!==null&&(typeof f=="number"?a.uniform1f(y,f):f.length===2?a.uniform2fv(y,f):f.length===3&&a.uniform3fv(y,f))}a.bindVertexArray(this.vao),a.drawElements(a.TRIANGLES,this.indexCount,a.UNSIGNED_SHORT,0),a.bindVertexArray(null)}bindThicknessMap(i,a){this.gl.useProgram(this.program);const u=this.loc("u_thicknessMap");u!==null&&(this.gl.activeTexture(this.gl.TEXTURE0+a),this.gl.bindTexture(this.gl.TEXTURE_2D,i),this.gl.uniform1i(u,a))}bindPearlDepthMap(i,a){this.gl.useProgram(this.program);const u=this.loc("u_pearlDepthMap");u!==null&&(this.gl.activeTexture(this.gl.TEXTURE0+a),this.gl.bindTexture(this.gl.TEXTURE_2D,i),this.gl.uniform1i(u,a))}dispose(){const i=this.gl;i.deleteBuffer(this.vertexBuffer),i.deleteBuffer(this.indexBuffer),i.deleteVertexArray(this.vao),i.deleteProgram(this.program)}bindAttribute(i,a,u,f,y){const w=this.gl.getAttribLocation(i,a);this.gl.enableVertexAttribArray(w),this.gl.vertexAttribPointer(w,u,this.gl.FLOAT,!1,f,y*Float32Array.BYTES_PER_ELEMENT)}loc(i){return this.uniformLocations.has(i)||this.uniformLocations.set(i,this.gl.getUniformLocation(this.program,i)),this.uniformLocations.get(i)}createProgram(i,a){const u=this.gl,f=(C,E)=>{const A=u.createShader(E);if(!A)throw new Error("Failed to create hero surface shader.");if(u.shaderSource(A,C),u.compileShader(A),!u.getShaderParameter(A,u.COMPILE_STATUS)){const N=u.getShaderInfoLog(A);throw u.deleteShader(A),new Error(`Hero surface shader compile error:
${N}`)}return A},y=f(i,u.VERTEX_SHADER),w=f(a,u.FRAGMENT_SHADER),S=u.createProgram();if(!S)throw new Error("Failed to create hero surface program.");if(u.attachShader(S,y),u.attachShader(S,w),u.linkProgram(S),u.deleteShader(y),u.deleteShader(w),!u.getProgramParameter(S,u.LINK_STATUS)){const C=u.getProgramInfoLog(S);throw u.deleteProgram(S),new Error(`Hero surface program link error:
${C}`)}return S}}const Jd=36,Zd=96,ep=Math.PI*2;function tp(h=vr.innerPearl,i=Jd,a=Zd){if(i<2)throw new Error("Pearl volume mesh requires at least two radial rings.");if(a<12)throw new Error("Pearl volume mesh requires at least twelve angle segments.");const u=[],f=[],y=1+i*a,{contour:w,depth:S}=h;for(const C of[1,-1]){const E=u.length/4,A=w.center,D=yr(S,0,A)*(C>0?S.frontScale:-S.rearScale);u.push(A[0],A[1],D,C);for(let z=1;z<=i;z+=1){const I=z/i;for(let O=0;O<a;O+=1){const q=O/a*ep,K=Zo(w,q),re=A[0]+Math.cos(q)*K*w.axes[0]*I,H=A[1]+Math.sin(q)*K*w.axes[1]*I,ue=yr(S,I,[re,H])*(C>0?S.frontScale:-S.rearScale);u.push(re,H,ue,C)}}const B=E+1;for(let z=0;z<a;z+=1){const I=(z+1)%a;f.push(E,B+z,B+I)}for(let z=1;z<i;z+=1){const I=E+1+(z-1)*a,O=I+a;for(let q=0;q<a;q+=1){const K=(q+1)%a;f.push(I+q,O+q,O+K,I+q,O+K,I+K)}}if(u.length/4!==E+y)throw new Error("Pearl volume mesh vertex layout is inconsistent.")}if(u.length/4>65535)throw new Error("Pearl volume mesh exceeds the 16-bit index envelope.");return{vertices:new Float32Array(u),indices:new Uint16Array(f),vertexCount:u.length/4,triangleCount:f.length/3}}const rp=`#version 300 es
precision highp float;

in vec3 a_position;
in float a_surface;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_breathingScale;

out float v_depth;
flat out float v_surface;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 scaledLocal = a_position.xy * u_radius * u_breathingScale;
  vec2 uv = u_center + vec2(scaledLocal.x / aspect, scaledLocal.y);
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  v_depth = clamp(0.5 + a_position.z * 0.5, 0.0, 1.0);
  v_surface = a_surface;
}
`,np=`#version 300 es
precision highp float;

in float v_depth;
flat in float v_surface;
out vec4 fragColor;

void main() {
  fragColor = v_surface > 0.0
    ? vec4(v_depth, 0.0, 1.0, 0.0)
    : vec4(0.0, v_depth, 0.0, 1.0);
}
`;class op{constructor(i){M(this,"program");M(this,"vao");M(this,"vertexBuffer");M(this,"indexBuffer");M(this,"indexCountPerSurface");M(this,"uniformLocations",new Map);this.gl=i;const a=tp();this.indexCountPerSurface=a.indices.length/2,this.program=this.createProgram(rp,np);const u=i.createVertexArray(),f=i.createBuffer(),y=i.createBuffer();if(!u||!f||!y)throw new Error("Failed to allocate pearl volume mesh.");this.vao=u,this.vertexBuffer=f,this.indexBuffer=y,i.bindVertexArray(u),i.bindBuffer(i.ARRAY_BUFFER,f),i.bufferData(i.ARRAY_BUFFER,a.vertices,i.STATIC_DRAW),i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,y),i.bufferData(i.ELEMENT_ARRAY_BUFFER,a.indices,i.STATIC_DRAW);const w=4*Float32Array.BYTES_PER_ELEMENT,S=i.getAttribLocation(this.program,"a_position"),C=i.getAttribLocation(this.program,"a_surface");i.enableVertexAttribArray(S),i.vertexAttribPointer(S,3,i.FLOAT,!1,w,0),i.enableVertexAttribArray(C),i.vertexAttribPointer(C,1,i.FLOAT,!1,w,3*Float32Array.BYTES_PER_ELEMENT),i.bindVertexArray(null)}draw(i){const a=this.gl;a.useProgram(this.program);for(const[u,f]of Object.entries(i)){const y=this.loc(u);y!==null&&(typeof f=="number"?a.uniform1f(y,f):f.length===2&&a.uniform2fv(y,f))}a.bindVertexArray(this.vao),a.disable(a.BLEND),a.colorMask(!0,!1,!0,!1),a.drawElements(a.TRIANGLES,this.indexCountPerSurface,a.UNSIGNED_SHORT,0),a.colorMask(!1,!0,!1,!0),a.drawElements(a.TRIANGLES,this.indexCountPerSurface,a.UNSIGNED_SHORT,this.indexCountPerSurface*Uint16Array.BYTES_PER_ELEMENT),a.colorMask(!0,!0,!0,!0),a.bindVertexArray(null)}dispose(){this.gl.deleteBuffer(this.vertexBuffer),this.gl.deleteBuffer(this.indexBuffer),this.gl.deleteVertexArray(this.vao),this.gl.deleteProgram(this.program)}loc(i){return this.uniformLocations.has(i)||this.uniformLocations.set(i,this.gl.getUniformLocation(this.program,i)),this.uniformLocations.get(i)}createProgram(i,a){const u=this.gl,f=(C,E)=>{const A=u.createShader(E);if(!A)throw new Error("Failed to create pearl volume shader.");if(u.shaderSource(A,C),u.compileShader(A),!u.getShaderParameter(A,u.COMPILE_STATUS)){const N=u.getShaderInfoLog(A);throw u.deleteShader(A),new Error(`Pearl volume shader compile error:
${N}`)}return A},y=f(i,u.VERTEX_SHADER),w=f(a,u.FRAGMENT_SHADER),S=u.createProgram();if(!S)throw new Error("Failed to create pearl volume program.");if(u.attachShader(S,y),u.attachShader(S,w),u.linkProgram(S),u.deleteShader(y),u.deleteShader(w),!u.getProgramParameter(S,u.LINK_STATUS)){const C=u.getProgramInfoLog(S);throw u.deleteProgram(S),new Error(`Pearl volume program link error:
${C}`)}return S}}const ia=6,lp=Math.PI*2;function pc(h,i,a=[1,1],u=64,f=128){if(u<8||f<12)throw new Error("Lofted structure mesh requires at least 8 latitude and 12 angle segments.");const y=[],w=[],S=yr(i,0,h.center);y.push(h.center[0],h.center[1],-S*i.rearScale);for(let N=1;N<u;N+=1){const D=N/u*Math.PI-Math.PI*.5,B=Math.pow(Math.max(0,Math.cos(D)),.92),z=Math.sin(D);for(let I=0;I<f;I+=1){const O=I/f*lp,q=Zo(h,O),K=h.center[0]+Math.cos(O)*q*a[0],re=h.center[1]+Math.sin(O)*q*a[1],H=h.center[0]+(K-h.center[0])*B,de=h.center[1]+(re-h.center[1])*B,ue=yr(i,0,[K,re]),pe=S+(ue-S)*B,Ce=z>=0?i.frontScale:i.rearScale,Ve=z*pe*Ce;y.push(H,de,Ve)}}const C=y.length/3;y.push(h.center[0],h.center[1],S*i.frontScale);const E=1;for(let N=0;N<f;N+=1){const D=(N+1)%f;w.push(0,E+D,E+N)}for(let N=0;N<u-2;N+=1){const D=E+N*f,B=D+f;for(let z=0;z<f;z+=1){const I=(z+1)%f;w.push(D+z,B+z,B+I,D+z,B+I,D+I)}}const A=E+(u-2)*f;for(let N=0;N<f;N+=1){const D=(N+1)%f;w.push(C,A+N,A+D)}if(y.length/3>65535)throw new Error("Lofted structure mesh exceeds the 16-bit index envelope.");return{vertices:new Float32Array(y),indices:new Uint16Array(w)}}function ip(h){const i=new Float32Array(h),a=18,{outerShell:u}=vr;for(let f=0;f<i.length/a;f+=1){const y=f*a,w=i[y],S=i[y+1],C=i[y+5],E=w-u.outer.center[0],A=S-u.outer.center[1],N=Math.atan2(A,E),D=Zo(u.outer,N),B=Math.min(.985,Math.hypot(E,A)/D),z=yr(u.depth,B,[w,S])*u.depth.frontScale,I=C<.5?.02:C<1.5?.03:.014;i[y+2]=z+I}return i}function ra(h,i,a,u=0,f){const y=h.length/a,w=new Float32Array(y*3);for(let C=0;C<i.length;C+=3){const E=i[C],A=i[C+1],N=i[C+2],D=E*a+u,B=A*a+u,z=N*a+u,I=h[B]-h[D],O=h[B+1]-h[D+1],q=h[B+2]-h[D+2],K=h[z]-h[D],re=h[z+1]-h[D+1],H=h[z+2]-h[D+2];let de=O*H-q*re,ue=q*K-I*H,pe=I*re-O*K;const Ce=(h[D]+h[B]+h[z])/3,Ve=(h[D+1]+h[B+1]+h[z+1])/3,qe=(h[D+2]+h[B+2]+h[z+2])/3;de*Ce+ue*Ve+pe*qe<0&&(de*=-1,ue*=-1,pe*=-1);for(const Ke of[E,A,N])w[Ke*3]+=de,w[Ke*3+1]+=ue,w[Ke*3+2]+=pe}const S=new Float32Array(y*ia);for(let C=0;C<y;C+=1){const E=C*a+u,A=C*3,N=Math.hypot(w[A],w[A+1],w[A+2])||1,D=C*ia;S[D]=h[E],S[D+1]=h[E+1],S[D+2]=h[E+2],S[D+3]=w[A]/N,S[D+4]=w[A+1]/N,S[D+5]=w[A+2]/N}return{vertices:S,indices:i}}const ap=`#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_structureYaw;
uniform float u_structurePitch;
uniform float u_modelScale;

out vec3 v_normal;
out vec3 v_position;

mat3 rotation(float yaw, float pitch) {
  float cy = cos(yaw);
  float sy = sin(yaw);
  float cx = cos(pitch);
  float sx = sin(pitch);
  mat3 yawMatrix = mat3(
    cy, 0.0, -sy,
    0.0, 1.0, 0.0,
    sy, 0.0, cy
  );
  mat3 pitchMatrix = mat3(
    1.0, 0.0, 0.0,
    0.0, cx, sx,
    0.0, -sx, cx
  );
  return pitchMatrix * yawMatrix;
}

void main() {
  mat3 modelRotation = rotation(u_structureYaw, u_structurePitch);
  vec3 position = modelRotation * (a_position * u_modelScale);
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = u_center + vec2(
    position.x * u_radius / aspect,
    position.y * u_radius
  );
  gl_Position = vec4(uv * 2.0 - 1.0, clamp(-position.z * 0.55, -0.98, 0.98), 1.0);
  v_position = position;
  v_normal = normalize(modelRotation * a_normal);
}
`,sp=`#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_position;

uniform vec3 u_baseColor;
uniform vec3 u_accentColor;
uniform float u_opacity;
uniform float u_surfaceRole;

out vec4 fragColor;

void main() {
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  vec3 faceNormal = normalize(cross(dFdx(v_position), dFdy(v_position)));
  if (dot(faceNormal, viewDirection) < 0.0) faceNormal *= -1.0;
  vec3 smoothNormal = normalize(v_normal);
  if (dot(smoothNormal, viewDirection) < 0.0) smoothNormal *= -1.0;
  vec3 normal = normalize(mix(faceNormal, smoothNormal, 0.58));
  vec3 keyDirection = normalize(vec3(-0.52, 0.64, 0.74));
  vec3 fillDirection = normalize(vec3(0.58, -0.22, 0.50));
  float key = max(dot(normal, keyDirection), 0.0);
  float fill = max(dot(normal, fillDirection), 0.0);
  float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
  float broadSpecular = pow(max(dot(normal, normalize(keyDirection + viewDirection)), 0.0), 24.0);
  float depthTone = smoothstep(-1.0, 1.0, v_position.z);
  vec3 color = u_baseColor * (0.24 + key * 0.56 + fill * 0.16);
  color = mix(color, u_accentColor, rim * (0.38 + u_surfaceRole * 0.18));
  color += u_accentColor * broadSpecular * (0.18 + u_surfaceRole * 0.10);
  color *= mix(0.78, 1.08, depthTone);
  fragColor = vec4(color * u_opacity, u_opacity);
}
`;class up{constructor(i){M(this,"program");M(this,"shell");M(this,"pearl");M(this,"membranes");M(this,"uniformLocations",new Map);this.gl=i,this.program=this.createProgram(ap,sp);const a=pc(gr.outer,gr.depth),u=pc(vr.innerPearl.contour,vr.innerPearl.depth,vr.innerPearl.contour.axes,52,112),f=yc();this.shell=this.createMesh(ra(a.vertices,a.indices,3)),this.pearl=this.createMesh(ra(u.vertices,u.indices,3)),this.membranes=this.createMesh(ra(ip(f.vertices),f.indices,18))}draw(i,a){const u=this.gl;u.useProgram(this.program),this.setUniforms(i),u.enable(u.BLEND),u.blendFunc(u.ONE,u.ONE_MINUS_SRC_ALPHA),u.disable(u.CULL_FACE),a==="turntable"?(u.enable(u.DEPTH_TEST),u.depthMask(!0),u.depthFunc(u.LEQUAL),this.drawMesh(this.shell,[.54,.57,.62],[.86,.89,.94],1,0),this.drawMesh(this.membranes,[.58,.61,.66],[.9,.93,.98],.82,.72)):(u.disable(u.DEPTH_TEST),u.depthMask(!1),this.drawMesh(this.shell,[.31,.34,.39],[.68,.73,.82],.28,0),u.enable(u.DEPTH_TEST),u.depthMask(!0),this.drawMesh(this.pearl,[.57,.6,.65],[.9,.92,.96],1,.35),this.drawMesh(this.membranes,[.68,.7,.75],[.97,.98,1],.96,1)),u.depthMask(!0),u.disable(u.DEPTH_TEST),u.disable(u.BLEND)}dispose(){const i=this.gl;for(const a of[this.shell,this.pearl,this.membranes])i.deleteBuffer(a.vertexBuffer),i.deleteBuffer(a.indexBuffer),i.deleteVertexArray(a.vao);i.deleteProgram(this.program)}createMesh(i){const a=this.gl,u=a.createVertexArray(),f=a.createBuffer(),y=a.createBuffer();if(!u||!f||!y)throw new Error("Failed to allocate structure turntable mesh.");a.bindVertexArray(u),a.bindBuffer(a.ARRAY_BUFFER,f),a.bufferData(a.ARRAY_BUFFER,i.vertices,a.STATIC_DRAW),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,y),a.bufferData(a.ELEMENT_ARRAY_BUFFER,i.indices,a.STATIC_DRAW);const w=ia*Float32Array.BYTES_PER_ELEMENT,S=a.getAttribLocation(this.program,"a_position"),C=a.getAttribLocation(this.program,"a_normal");return a.enableVertexAttribArray(S),a.vertexAttribPointer(S,3,a.FLOAT,!1,w,0),a.enableVertexAttribArray(C),a.vertexAttribPointer(C,3,a.FLOAT,!1,w,3*Float32Array.BYTES_PER_ELEMENT),a.bindVertexArray(null),{vao:u,vertexBuffer:f,indexBuffer:y,indexCount:i.indices.length}}drawMesh(i,a,u,f,y){const w=this.gl;w.uniform3fv(this.loc("u_baseColor"),a),w.uniform3fv(this.loc("u_accentColor"),u),w.uniform1f(this.loc("u_opacity"),f),w.uniform1f(this.loc("u_surfaceRole"),y),w.bindVertexArray(i.vao),w.drawElements(w.TRIANGLES,i.indexCount,w.UNSIGNED_SHORT,0),w.bindVertexArray(null)}setUniforms(i){const a=this.gl;for(const[u,f]of Object.entries(i)){const y=this.loc(u);y!==null&&(typeof f=="number"?a.uniform1f(y,f):f.length===2?a.uniform2fv(y,f):f.length===3&&a.uniform3fv(y,f))}}loc(i){return this.uniformLocations.has(i)||this.uniformLocations.set(i,this.gl.getUniformLocation(this.program,i)),this.uniformLocations.get(i)}createProgram(i,a){const u=this.gl,f=(C,E)=>{const A=u.createShader(E);if(!A)throw new Error("Failed to create structure turntable shader.");if(u.shaderSource(A,C),u.compileShader(A),!u.getShaderParameter(A,u.COMPILE_STATUS)){const N=u.getShaderInfoLog(A);throw u.deleteShader(A),new Error(`Structure turntable shader compile error:
${N}`)}return A},y=f(i,u.VERTEX_SHADER),w=f(a,u.FRAGMENT_SHADER),S=u.createProgram();if(!S)throw new Error("Failed to create structure turntable program.");if(u.attachShader(S,y),u.attachShader(S,w),u.linkProgram(S),u.deleteShader(y),u.deleteShader(w),!u.getProgramParameter(S,u.LINK_STATUS)){const C=u.getProgramInfoLog(S);throw u.deleteProgram(S),new Error(`Structure turntable program link error:
${C}`)}return S}}class cp{constructor(i=gc){M(this,"startTime");M(this,"lastTimestamp",0);M(this,"smoothedAudioEnergy",0);M(this,"smoothedAudioOnset",0);M(this,"identityDNA");M(this,"targetProfile","idle");M(this,"currentProfile","idle");M(this,"profileTransitionProgress",1);M(this,"profileTransitionStartTime",0);this.identityDNA=i,this.startTime=performance.now()/1e3}setIdentityDNA(i){this.identityDNA=i}setProfile(i){i!==this.targetProfile&&(this.currentProfile=this.targetProfile,this.targetProfile=i,this.profileTransitionProgress=0,this.profileTransitionStartTime=performance.now()/1e3)}setAudioInput(i,a){const u=this.lastTimestamp>0?performance.now()/1e3-this.lastTimestamp:.016666666666666666,f=1-Math.exp(-u/.08),y=1-Math.exp(-u/.25),w=i>this.smoothedAudioEnergy?f:y;this.smoothedAudioEnergy+=(i-this.smoothedAudioEnergy)*w,this.smoothedAudioOnset+=(a-this.smoothedAudioOnset)*f}tick(){const i=performance.now()/1e3,a=i-this.startTime;this.lastTimestamp>0?i-this.lastTimestamp:1/60,this.lastTimestamp=i;const{shape:u,motion:f,breathing:y,highlight:w,timing:S}=this.identityDNA;if(this.profileTransitionProgress<1){const H=i-this.profileTransitionStartTime,de=S.settleDuration;this.profileTransitionProgress=Math.min(1,H/de)}const C=this.profileTransitionProgress<S.anticipationDuration?Math.sin(this.profileTransitionProgress/S.anticipationDuration*Math.PI)*-.02:0,E=a%f.breathingPeriod/f.breathingPeriod,D=1+(Math.sin(E*Math.PI*2)-.15*Math.sin(E*Math.PI*4*y.inhaleRatio))*.028*y.deepBreathScale+C,B=Math.sin(a/f.floatAmplitude*Math.PI*2),z=Math.sin(a/(f.floatAmplitude*1.618)*Math.PI*2)*.28,I=(B+z)*f.floatAmplitude,O=a/w.driftPeriod*Math.PI*2,q=Math.sin(a*f.microJitterFrequency*Math.PI*2),K=Math.sin(a*f.microJitterFrequency*1.37*Math.PI*2)*.5,re=Math.abs((q+K)/1.5)*.007*u.organicAsymmetry;return{time:a,breathingScale:Math.max(.9,Math.min(1.1,D)),floatOffset:I,microJitter:re,highlightDrift:O%(Math.PI*2),profileBlend:this.profileTransitionProgress,audioEnergy:Math.max(0,Math.min(1,this.smoothedAudioEnergy)),audioOnset:Math.max(0,Math.min(1,this.smoothedAudioOnset))}}getEmbodimentState(){return Md(this.targetProfile,.42*this.identityDNA.shape.baseScale,this.profileTransitionProgress)}reset(){this.startTime=performance.now()/1e3,this.smoothedAudioEnergy=0,this.smoothedAudioOnset=0,this.profileTransitionProgress=1}}const Jo={background:!0,shadow:!0,glassBody:!0,coreLight:!0,highlight:!0,debug:!1},fp={idle:0,listening:1,thinking:2,speaking:3,success:4,error:5,sleeping:6},sa=`

// ─── Hash functions ───────────────────────────────────────────────────────────

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  p = mat2(127.1, 311.7, 269.5, 183.3) * p;
  return fract(sin(p) * 43758.5453);
}

// ─── Smooth value noise [0,1] ─────────────────────────────────────────────────

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Quintic smoothstep
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float a = hash(i + vec2(0.0, 0.0));
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// ─── Fractal Brownian Motion ──────────────────────────────────────────────────

float fbm2(vec2 p, int octaves, float lacunarity, float gain) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * noise2(p * frequency);
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return value;
}

// Convenience overload: 4 octaves, standard settings
float fbm2(vec2 p) {
  return fbm2(p, 4, 2.0, 0.5);
}

// ─── Curl noise ───────────────────────────────────────────────────────────────
// Divergence-free 2D curl field, good for surface flow

vec2 curl2(vec2 p) {
  const float eps = 0.001;
  float n1 = noise2(vec2(p.x, p.y + eps));
  float n2 = noise2(vec2(p.x, p.y - eps));
  float n3 = noise2(vec2(p.x + eps, p.y));
  float n4 = noise2(vec2(p.x - eps, p.y));
  float dydx = (n1 - n2) / (2.0 * eps);
  float dxdy = (n3 - n4) / (2.0 * eps);
  return vec2(dydx, -dxdy);
}

// ─── Domain-warped noise (for organic blob deformation) ───────────────────────
// Applies two levels of domain warping to break symmetry further

float warpedNoise(vec2 p, float warpStrength) {
  vec2 q = vec2(
    noise2(p + vec2(0.0, 0.0)),
    noise2(p + vec2(5.2, 1.3))
  );
  vec2 r = vec2(
    noise2(p + warpStrength * q + vec2(1.7, 9.2)),
    noise2(p + warpStrength * q + vec2(8.3, 2.8))
  );
  return noise2(p + warpStrength * r);
}

`,Mt=h=>{const i=h.toFixed(6).replace(/0+$/,"").replace(/\.$/,"");return i.includes(".")?i:`${i}.0`},hc=h=>h.map(Mt).join(", "),Nn=gr.outer,mr=gr.innerLobe,_c=`
const float LUCA_TAU = 6.28318530718;
const int LUCA_OUTER_COUNT = ${Nn.radiusSamples.length};
const float LUCA_OUTER_RADII[LUCA_OUTER_COUNT] = float[LUCA_OUTER_COUNT](${hc(Nn.radiusSamples)});
const float LUCA_OUTER_ROTATION = ${Mt(Nn.rotation)};
const vec2 LUCA_OUTER_CENTER = vec2(${Mt(Nn.center[0])}, ${Mt(Nn.center[1])});

const int LUCA_INNER_COUNT = ${mr.radiusSamples.length};
const float LUCA_INNER_RADII[LUCA_INNER_COUNT] = float[LUCA_INNER_COUNT](${hc(mr.radiusSamples)});
const float LUCA_INNER_ROTATION = ${Mt(mr.rotation)};
const vec2 LUCA_INNER_CENTER = vec2(${Mt(mr.center[0])}, ${Mt(mr.center[1])});
const vec2 LUCA_INNER_AXES = vec2(${Mt(mr.axes[0])}, ${Mt(mr.axes[1])});

vec2 lucaRotate(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c) * p;
}

float lucaCatmullRom(float p0, float p1, float p2, float p3, float t) {
  float t2 = t * t;
  float t3 = t2 * t;
  return 0.5 * (2.0 * p1
    + (-p0 + p2) * t
    + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
    + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3);
}

float lucaOuterRadius(float angle) {
  float position = fract((angle - LUCA_OUTER_ROTATION + LUCA_TAU) / LUCA_TAU) * float(LUCA_OUTER_COUNT);
  int i1 = int(floor(position));
  float t = fract(position);
  int i0 = (i1 - 1 + LUCA_OUTER_COUNT) % LUCA_OUTER_COUNT;
  int i2 = (i1 + 1) % LUCA_OUTER_COUNT;
  int i3 = (i1 + 2) % LUCA_OUTER_COUNT;
  return lucaCatmullRom(LUCA_OUTER_RADII[i0], LUCA_OUTER_RADII[i1], LUCA_OUTER_RADII[i2], LUCA_OUTER_RADII[i3], t);
}

float lucaInnerRadius(float angle) {
  float position = fract((angle - LUCA_INNER_ROTATION + LUCA_TAU) / LUCA_TAU) * float(LUCA_INNER_COUNT);
  int i1 = int(floor(position));
  float t = fract(position);
  int i0 = (i1 - 1 + LUCA_INNER_COUNT) % LUCA_INNER_COUNT;
  int i2 = (i1 + 1) % LUCA_INNER_COUNT;
  int i3 = (i1 + 2) % LUCA_INNER_COUNT;
  return lucaCatmullRom(LUCA_INNER_RADII[i0], LUCA_INNER_RADII[i1], LUCA_INNER_RADII[i2], LUCA_INNER_RADII[i3], t);
}

// Negative inside, positive outside. Radial authored field; not a true Euclidean SDF.
float lucaCanonicalVolumeField(vec2 p) {
  vec2 q = p - LUCA_OUTER_CENTER;
  float angle = atan(q.y, q.x);
  return length(q) - lucaOuterRadius(angle);
}

vec2 lucaInnerLobeSpace(vec2 p) {
  return lucaRotate(p - LUCA_INNER_CENTER, -LUCA_INNER_ROTATION) / LUCA_INNER_AXES;
}

float lucaCanonicalInnerLobeField(vec2 p) {
  vec2 q = lucaInnerLobeSpace(p);
  float angle = atan(q.y, q.x);
  return (length(q) - lucaInnerRadius(angle)) * min(LUCA_INNER_AXES.x, LUCA_INNER_AXES.y);
}
`,Sc=`
${sa}
${_c}

float lucaAnimatedVolumeField(
  vec2 p,
  float noiseTime,
  float time,
  float lowFreqAmp,
  float midFreqAmp,
  float highFreqAmp,
  float microJitter,
  float audioEnergy,
  float audioOnset
) {
  float authoredField = lucaCanonicalVolumeField(p);
  vec2 noisePos = p * 1.8 + vec2(noiseTime * 0.7, noiseTime * 0.5);
  float n1 = noise2(noisePos * lowFreqAmp * 28.0) * 2.0 - 1.0;
  vec2 noisePos2 = p * 2.8 + vec2(noiseTime * 1.1, noiseTime * 0.8 + 2.3);
  float n2 = noise2(noisePos2 * midFreqAmp * 120.0 + vec2(3.3, 1.7)) * 2.0 - 1.0;
  float n3 = noise2(p * 8.0 + time * 3.7 + vec2(1.1, 2.2)) * 2.0 - 1.0;
  float identitySafeDeform =
      n1 * lowFreqAmp * 0.22
    + n2 * midFreqAmp * 0.18
    + n3 * highFreqAmp * 0.20
    + audioEnergy * 0.018
    + audioOnset * 0.028
    + microJitter * 0.30 * (noise2(p * 12.0 + time * 4.2) * 2.0 - 1.0);
  return authoredField - identitySafeDeform;
}
`,dp=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

// ─── Uniforms ─────────────────────────────────────────────────────────────────

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_noiseTime;      // Slow-moving time for morph (u_time * morphSpeed)

// Orb placement
uniform vec2  u_center;         // Orb center in UV [0,1]
uniform float u_radius;         // Orb radius in UV units

// Animation
uniform float u_breathingScale; // 0.97–1.03
uniform float u_microJitter;    // 0–0.008
uniform float u_audioEnergy;    // 0–1
uniform float u_audioOnset;     // 0–1

// Glass material
uniform float u_refractionStrength;  // How much the background is offset
uniform float u_fresnelExponent;     // Width of Fresnel rim
uniform float u_fresnelStrength;     // Intensity of Fresnel rim
uniform float u_transparency;        // Overall transmittance at normal incidence
uniform float u_specularExponent;    // Blinn-Phong shininess
uniform float u_specularIntensity;   // Specular brightness
uniform float u_subsurfaceDepth;     // Internal scatter depth
uniform float u_edgeSoftness;        // Silhouette AA width
uniform float u_chromaticAberration; // Chromatic split at edges
uniform sampler2D u_thicknessMap;
uniform sampler2D u_sceneTexture;
uniform bool u_hasSceneTexture;
uniform vec3 u_absorption;
uniform float u_opticalDensity;
uniform float u_scattering;
uniform float u_causticStrength;
uniform float u_sceneTransmission;
uniform float u_shellReflectivity;

// Colors
uniform vec3  u_glassColor;
uniform vec3  u_rimColor;
uniform vec3  u_innerGlowColor;
uniform float u_innerGlowIntensity;

// Blob shape
uniform float u_lowFreqAmp;     // Large bump amplitude
uniform float u_midFreqAmp;     // Medium detail amplitude
uniform float u_highFreqAmp;    // Surface tension ripple amplitude

// Lighting (key light for specular)
uniform vec2  u_keyLightPos;    // Light position in UV
uniform float u_keyLightIntensity;
uniform vec3  u_keyLightColor;
uniform vec2  u_fillLightPos;
uniform float u_fillLightIntensity;
uniform vec3  u_fillLightColor;

// ─── Noise ────────────────────────────────────────────────────────────────────
${Sc}

// ─── Blob SDF ────────────────────────────────────────────────────────────────

/**
 * Signed distance function for the organic blob.
 * Returns negative values inside the blob, positive outside.
 * p: point in orb-local space (orb center = origin, orb radius = 1.0)
 */
float blobSDF(vec2 p) {
  return lucaAnimatedVolumeField(
    p, u_noiseTime, u_time, u_lowFreqAmp, u_midFreqAmp,
    u_highFreqAmp, u_microJitter, u_audioEnergy, u_audioOnset
  );
}

// ─── Compute SDF gradient (surface normal) ────────────────────────────────────

vec2 blobNormal(vec2 p) {
  const float eps = 0.002;
  float dx = blobSDF(p + vec2(eps, 0.0)) - blobSDF(p - vec2(eps, 0.0));
  float dy = blobSDF(p + vec2(0.0, eps)) - blobSDF(p - vec2(0.0, eps));
  return normalize(vec2(dx, dy));
}

// ─── Fresnel approximation ────────────────────────────────────────────────────

float fresnel(vec3 normal, vec3 viewDir, float exponent) {
  float cosTheta = clamp(dot(normal, viewDir), 0.0, 1.0);
  return pow(1.0 - cosTheta, exponent);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  // Work in corrected aspect space
  vec2 p = (uv - u_center);
  p.x *= aspect;

  // Scale to orb-local space (orb radius = 1.0)
  vec2 localP = p / (u_radius * u_breathingScale);

  // ── SDF evaluation ────────────────────────────────────────────────────────

  float sdf = blobSDF(localP);

  // Edge anti-aliasing
  float edgeFade = 1.0 - smoothstep(-u_edgeSoftness / u_radius, u_edgeSoftness / u_radius, sdf);

  // Discard fully outside fragments
  if (edgeFade < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  // ── Surface normal ────────────────────────────────────────────────────────

  vec2 contourNormal2D = blobNormal(localP);

  // ── Depth inside orb ──────────────────────────────────────────────────────

  vec4 opticalSample = texture(u_thicknessMap, uv);
  float frontDepth = opticalSample.r;
  float rearDepth = opticalSample.g;
  float meshCoverage = min(opticalSample.b, opticalSample.a);
  float thickness = max(frontDepth - rearDepth, 0.0) * meshCoverage;
  float depth = thickness;

  // The rasterized front surface supplies a true depth gradient. Blend it
  // with the authored contour normal to keep the antialiased rim stable.
  vec2 depthTexel = 2.0 / u_resolution;
  vec2 depthGradient = vec2(
    texture(u_thicknessMap, uv + vec2(depthTexel.x, 0.0)).r
      - texture(u_thicknessMap, uv - vec2(depthTexel.x, 0.0)).r,
    texture(u_thicknessMap, uv + vec2(0.0, depthTexel.y)).r
      - texture(u_thicknessMap, uv - vec2(0.0, depthTexel.y)).r
  ) * 0.25;
  vec3 depthNormal = normalize(vec3(-depthGradient * vec2(aspect, 1.0) * 52.0, 1.0));
  vec2 depthNormal2D = length(depthNormal.xy) > 0.001 ? normalize(depthNormal.xy) : contourNormal2D;
  vec2 normal2D = normalize(mix(contourNormal2D, depthNormal2D, 0.68));
  float normalZ = mix(0.10, 1.0, clamp(thickness, 0.0, 1.0));
  vec3 contourNormal = normalize(vec3(normal2D * mix(1.0, 0.28, thickness), normalZ));
  vec3 normal = normalize(mix(contourNormal, depthNormal, 0.72));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  // ── Asymmetrical Fresnel rim (Upper-Left Brighter, Lower-Right Softer) ─────

  vec2 lightDir2D = normalize(vec2(-0.5, 0.7));
  float rimAngle = dot(normal2D, lightDir2D);
  float rimAsymmetry = mix(0.45, 1.30, rimAngle * 0.5 + 0.5);

  float fresnelF = fresnel(normal, viewDir, u_fresnelExponent) * u_fresnelStrength * rimAsymmetry;
  // The master reads as a broad silver wall, not a neon contour. These two
  // overlapping lobes turn the depth field into a soft nested glass band.
  float outerWall = exp(-pow((thickness - 0.13) / 0.165, 2.0)) * edgeFade;
  float innerWall = exp(-pow((thickness - 0.31) / 0.175, 2.0)) * edgeFade;
  float lowerWall = smoothstep(-0.15, 0.72, dot(normal2D, normalize(vec2(-0.30, -0.95))));
  vec3 silverOuter = vec3(0.78, 0.82, 0.86) * outerWall * rimAsymmetry;
  vec3 silverInner = mix(vec3(0.42, 0.47, 0.54), vec3(0.82, 0.85, 0.88), lowerWall)
    * innerWall * (0.46 + lowerWall * 0.46);
  vec3 rimLight = u_rimColor * fresnelF * 0.46
    + (silverOuter * 0.72 + silverInner * 0.62) * u_shellReflectivity;

  // ── Key light specular (Blinn-Phong) ─────────────────────────────────────

  vec2 keyLightLocal = (u_keyLightPos - u_center);
  keyLightLocal.x *= aspect;
  vec3 keyDir = normalize(vec3(keyLightLocal - p, 1.5));
  vec3 halfDir = normalize(keyDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), u_specularExponent) * u_specularIntensity;
  vec3 keySpecular = mix(u_keyLightColor, vec3(0.92, 0.94, 0.97), 0.58)
    * spec * u_keyLightIntensity * 0.18;

  // ── Fill light diffuse ────────────────────────────────────────────────────

  vec2 fillLightLocal = (u_fillLightPos - u_center);
  fillLightLocal.x *= aspect;
  vec3 fillDir = normalize(vec3(fillLightLocal - p, 1.2));
  float fillDiff = max(dot(normal, fillDir), 0.0) * u_fillLightIntensity * 0.25;
  vec3 fillLight = u_fillLightColor * fillDiff;

  // ── Subsurface / inner glow ───────────────────────────────────────────────

  // ── Chromatic aberration at edges ─────────────────────────────────────────

  float refractionDepth = mix(0.08, 0.24, thickness);
  vec2 refractionOffset = -normal2D * u_refractionStrength * refractionDepth;
  float dispersion = u_chromaticAberration * (0.45 + fresnelF);
  vec2 uvR = clamp(uv + refractionOffset * (1.0 + dispersion), vec2(0.001), vec2(0.999));
  vec2 uvG = clamp(uv + refractionOffset, vec2(0.001), vec2(0.999));
  vec2 uvB = clamp(uv + refractionOffset * (1.0 - dispersion), vec2(0.001), vec2(0.999));
  vec3 refractedScene = vec3(
    texture(u_sceneTexture, uvR).r,
    texture(u_sceneTexture, uvG).g,
    texture(u_sceneTexture, uvB).b
  );
  vec3 transmittance = exp(-u_absorption * thickness * u_opticalDensity);
  vec3 transmittedScene = refractedScene * transmittance;
  vec3 volumeScatter = u_glassColor * (vec3(1.0) - transmittance)
    * u_scattering * (0.35 + thickness * 0.65);
  float silverVeil = smoothstep(0.07, 0.62, thickness)
    * (0.68 + 0.32 * max(dot(normal, normalize(vec3(-0.42, 0.52, 1.0))), 0.0));
  volumeScatter += vec3(0.25, 0.29, 0.34) * silverVeil * 0.24;
  float causticBand = exp(-pow((thickness - 0.34) / 0.13, 2.0))
    * max(dot(normal2D, normalize(vec2(-0.7, 0.5))), 0.0);
  vec3 innerCaustic = u_rimColor * causticBand * u_causticStrength;

  // ── Glass body color ──────────────────────────────────────────────────────

  // Glass transparency varies with angle: more transparent at center, less at edge
  float angleTransparency = u_transparency - fresnelF * 0.3;
  vec3 glassBody = u_glassColor * (1.0 - angleTransparency) * (0.28 + depth * 0.52);

  // ── Composite ─────────────────────────────────────────────────────────────

  float sceneMix = u_hasSceneTexture ? u_sceneTransmission : 0.0;
  vec3 color = mix(glassBody, transmittedScene, sceneMix);
  color += volumeScatter;
  color += innerCaustic;
  color += rimLight;
  color += keySpecular;
  color += fillLight;

  float absorptionOpacity = 1.0 - dot(transmittance, vec3(0.2126, 0.7152, 0.0722));
  float bodyOpacity = u_hasSceneTexture
    ? 0.16 + absorptionOpacity * 0.52
    : 0.34 + absorptionOpacity * 0.38;
  bodyOpacity += outerWall * 0.15 + innerWall * 0.08;
  float alpha = mix(bodyOpacity, 0.96, clamp(fresnelF * 0.75 + spec * 0.45, 0.0, 1.0));
  alpha = clamp(alpha, 0.0, 1.0);

  // Apply edge anti-aliasing
  alpha *= edgeFade;
  color *= edgeFade;

  // Premultiplied alpha (required for correct compositing over transparent canvas)
  fragColor = vec4(color * alpha, alpha);
}
`,pp=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// Orb placement
uniform vec2  u_center;         // Orb center in UV [0,1]
uniform float u_radius;         // Orb base radius in UV units
uniform float u_breathingScale; // Applied to ring radii so they track the orb

// Bloom
uniform vec3  u_bloomColor;
uniform float u_bloomIntensity;
uniform float u_bloomRadius;    // Multiplier on u_radius

// Ripple rings
uniform vec3  u_rippleColor;
uniform float u_rippleOpacity;
uniform int   u_rippleCount;    // 3 or 4
uniform float u_rippleSpacing;  // Gap between rings as fraction of radius
uniform float u_rippleWidth;    // Width of each ring in UV units

// Audio reactivity
uniform float u_audioEnergy;    // Expands rings slightly on beat

${sa}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  float dist = length(p);
  float r = u_radius * u_breathingScale;

  // ── Ambient bloom pool ────────────────────────────────────────────────────

  float bloomR = r * u_bloomRadius;
  // Gaussian-like falloff: very soft, large
  float bloom = exp(-dist * dist / (bloomR * bloomR * 0.8)) * u_bloomIntensity;
  // Audio makes bloom pulse slightly
  bloom *= 1.0 + u_audioEnergy * 0.18;

  // ── Concentric ripple rings ───────────────────────────────────────────────

  float rippleSum = 0.0;
  int count = clamp(u_rippleCount, 1, 6);

  for (int i = 0; i < 6; i++) {
    if (i >= count) break;

    float fi = float(i);

    // Each ring slowly drifts outward over time, creating a subtle
    // "radiating" effect. The offset is very slow — not a wave animation,
    // just a gentle breathing of the rings.
    float drift = mod(u_time * 0.012 + fi * 0.25, 1.0) * r * 0.15;

    float ringRadius = r * (1.18 + fi * u_rippleSpacing) + drift;
    // Audio expands rings
    ringRadius += u_audioEnergy * r * 0.04;

    // Smooth ring function: bell curve centered on ringRadius
    float d = abs(dist - ringRadius);
    float ringW = u_rippleWidth * (1.0 + fi * 0.2); // outer rings slightly wider
    float ring = exp(-d * d / (ringW * ringW));

    // Fade outer rings
    float fade = pow(1.0 - fi / float(count), 1.5);
    rippleSum += ring * fade;
  }

  // Slight wave in ripple opacity (breathing quality)
  float rippleWave = 1.0 + sin(u_time * 0.4) * 0.08;
  float rippleAlpha = rippleSum * u_rippleOpacity * rippleWave;

  // ── Composite ─────────────────────────────────────────────────────────────

  // Bloom is additive glow — alpha is the brightness
  vec3 color = u_bloomColor * bloom + u_rippleColor * rippleSum * u_rippleOpacity;
  float alpha = bloom * 0.4 + rippleAlpha * 0.7;
  alpha = clamp(alpha, 0.0, 1.0);

  // Premultiplied alpha
  fragColor = vec4(color * alpha, alpha);
}
`,hp=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_noiseTime;

// Orb placement
uniform vec2  u_center;
uniform float u_radius;
uniform float u_breathingScale;

// Core light
uniform vec3  u_coreColor;
uniform float u_coreIntensity;   // Overall brightness [0,1]
uniform float u_coreRadius;      // Size relative to orb radius [0,1]

// Secondary inner corona
uniform vec3  u_coronaColor;
uniform float u_coronaIntensity;
uniform float u_coronaRadius;

// Audio
uniform float u_audioEnergy;
uniform float u_audioOnset;

// Profile
uniform float u_profile;        // 0–6

${Sc}

// Blob SDF (must match glass.frag.ts exactly for correct masking)
uniform float u_lowFreqAmp;
uniform float u_midFreqAmp;
uniform float u_highFreqAmp;
uniform float u_microJitter;
uniform sampler2D u_pearlDepthMap;

float blobSDF(vec2 p) {
  return lucaAnimatedVolumeField(
    p, u_noiseTime, u_time, u_lowFreqAmp, u_midFreqAmp,
    u_highFreqAmp, u_microJitter, u_audioEnergy, u_audioOnset
  );
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  float scale = u_radius * u_breathingScale;
  vec2 localP = p / scale;

  // ── Orb mask ──────────────────────────────────────────────────────────────

  // Only render inside the blob shape
  float sdf = blobSDF(localP);
  float insideMask = 1.0 - smoothstep(-0.05, 0.01, sdf);
  if (insideMask < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  // ── Core glow ─────────────────────────────────────────────────────────────

  // Center the glow slightly above the geometric center
  // (gives it a "looking up" quality — more alive)
  vec4 pearlSample = texture(u_pearlDepthMap, uv);
  float pearlThickness = max(pearlSample.r - pearlSample.g, 0.0)
    * min(pearlSample.b, pearlSample.a);
  float innerLobeMask = smoothstep(0.005, 0.055, pearlThickness);
  vec2 pearlCenter = vec2(-0.08, -0.10);
  vec2 coreDelta = (localP - pearlCenter) / vec2(0.73, 0.62);
  float coreAngle = -0.20;
  coreDelta = mat2(
    cos(coreAngle), -sin(coreAngle),
    sin(coreAngle), cos(coreAngle)
  ) * coreDelta;
  coreDelta.x *= 2.45;
  coreDelta.y *= 0.58;
  float distFromGlow = length(coreDelta);

  // Gaussian core
  float coreR = u_coreRadius;
  float coreGlow = exp(-distFromGlow * distFromGlow / (coreR * coreR));
  float lobeVolume = pow(clamp(pearlThickness / 0.62, 0.0, 1.0), 1.08);
  coreGlow = (coreGlow * 0.42 + lobeVolume * 0.10) * innerLobeMask;

  // Audio pulse: immediate brightness spike on onset
  float audioPulse = 1.0 + u_audioEnergy * 0.35 + u_audioOnset * 0.50;
  coreGlow *= audioPulse;

  // Breathing modulation — very subtle, in phase with breathing
  float breathMod = 1.0 + sin(u_time * 1.496) * 0.04; // 1.496 = 2π/4.2s
  coreGlow *= breathMod;

  // ── Secondary corona ──────────────────────────────────────────────────────

  float coronaR = u_coronaRadius;
  float corona = exp(-distFromGlow * distFromGlow / (coronaR * coronaR)) * innerLobeMask;
  // Corona is the wider, dimmer halo around the core
  corona = max(corona - coreGlow * 0.6, 0.0);

  // ── Composite ─────────────────────────────────────────────────────────────

  vec3 color = u_coreColor * coreGlow * u_coreIntensity
             + u_coronaColor * corona * u_coronaIntensity;

  // Apply orb mask — fade at edges so glow doesn't leak outside
  float alpha = (coreGlow * u_coreIntensity + corona * u_coronaIntensity * 0.5) * insideMask;
  alpha = clamp(alpha, 0.0, 1.0);

  // Premultiplied additive — this layer uses SRC_ALPHA / ONE blend mode
  fragColor = vec4(color * alpha, alpha);
}
`,mp=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// Orb placement
uniform vec2  u_center;
uniform float u_radius;
uniform float u_breathingScale;

// Key highlight (large, soft, upper area)
uniform vec3  u_keyHighlightColor;
uniform float u_keyHighlightIntensity;
uniform float u_keyHighlightSize;     // Relative to radius
uniform vec2  u_keyHighlightOffset;   // Offset from center in orb-radius units
uniform float u_highlightDrift;       // Phase 0–2π, slow rotation

// Secondary highlight (smaller, lower, complementary)
uniform vec3  u_secondaryHighlightColor;
uniform float u_secondaryHighlightIntensity;
uniform float u_secondaryHighlightSize;
uniform vec2  u_secondaryHighlightOffset;

// Orb mask radius (approximate — not full SDF, just radius check)
uniform float u_maskSoftness;

${_c}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  float scale = u_radius * u_breathingScale;
  vec2 localP = p / scale;

  // ── Orb mask (approximate sphere — highlights only appear inside orb) ─────

  float orbMask = 1.0 - smoothstep(-u_maskSoftness, u_maskSoftness, lucaCanonicalVolumeField(localP));
  if (orbMask < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  // ── Highlight drift: the key highlight slowly wanders ────────────────────

  // The drift is very subtle — imagine ambient light slowly shifting in a room
  float driftX = sin(u_highlightDrift) * 0.08;
  float driftY = cos(u_highlightDrift * 0.7) * 0.05;

  // ── Key highlight ─────────────────────────────────────────────────────────

  vec2 keyCenter = vec2(-0.18, 0.16) + u_keyHighlightOffset * 0.22 + vec2(driftX, driftY) * 0.22;
  vec2 dKey = localP - keyCenter;
  // Elliptical: tilted slightly to match Apple's painterly highlight vector
  float angle = 0.35;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  dKey = rot * dKey;
  dKey.x *= 0.70;
  dKey.y *= 1.15;

  float keyDist = length(dKey);
  float keyR = u_keyHighlightSize;
  
  // Painterly dual-falloff (bright core + soft ambient spread)
  float coreSpot = exp(-pow(keyDist / (keyR * 0.45), 2.2));
  float softHalo = exp(-pow(keyDist / keyR, 1.4)) * 0.55;
  float interiorVeil = (coreSpot + softHalo) * 0.12;
  float signedField = lucaCanonicalVolumeField(localP);
  float shellRibbon = exp(-pow((signedField + 0.075) / 0.070, 2.0));
  vec2 shellDirection = normalize(localP - LUCA_OUTER_CENTER);
  float upperLeftLight = smoothstep(-0.36, 0.88, dot(shellDirection, normalize(vec2(-0.72, 0.69))));
  float keyGlow = shellRibbon * mix(0.16, 1.0, upperLeftLight) + interiorVeil;

  // ── Secondary highlight (smaller, rounder, different position) ────────────

  vec2 secCenter = u_secondaryHighlightOffset + vec2(-driftX * 0.4, driftY * 0.3);
  float secDist = length(localP - secCenter);
  float secR = u_secondaryHighlightSize;
  float secGlow = exp(-pow(secDist / secR, 2.0));

  // ── Composite ─────────────────────────────────────────────────────────────

  vec3 heroSilver = mix(u_keyHighlightColor, vec3(0.94, 0.95, 0.97), 0.64);
  vec3 color = heroSilver * keyGlow * u_keyHighlightIntensity * 0.68
             + u_secondaryHighlightColor * secGlow * u_secondaryHighlightIntensity * 0.42;

  float alpha = (keyGlow * u_keyHighlightIntensity * 0.62 + secGlow * u_secondaryHighlightIntensity * 0.18);
  alpha *= orbMask;
  alpha = clamp(alpha, 0.0, 1.0);

  // Premultiplied
  fragColor = vec4(color * alpha, alpha);
}
`,vp=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// Orb placement
uniform vec2  u_center;
uniform float u_radius;
uniform float u_breathingScale;
uniform float u_floatOffset;     // Vertical drift in normalized units

// Shadow shape
uniform float u_shadowOffsetY;   // How far below orb center (normalized)
uniform float u_shadowSpreadX;   // Horizontal spread (> 1 = wider than orb)
uniform float u_shadowSpreadY;   // Vertical compression (< 1 = flattened)
uniform float u_shadowOpacity;   // Overall alpha [0,1]
uniform vec3  u_shadowColor;

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  // Shadow center: offset below the orb, tracking its float position
  float shadowY = -(u_radius * u_shadowOffsetY) - u_floatOffset;
  vec2 shadowCenter = vec2(0.0, shadowY);

  vec2 d = p - shadowCenter;

  // Elliptical shadow: stretched on X, compressed on Y
  float r = u_radius * u_breathingScale;
  d.x /= r * u_shadowSpreadX;
  d.y /= r * u_shadowSpreadY;

  float dist = length(d);

  // Soft gaussian shadow
  // Shadow gets softer and more transparent as it gets farther from orb
  float proximityFade = 1.0 - clamp(abs(u_floatOffset) / (u_radius * 0.4), 0.0, 1.0);
  float shadow = exp(-dist * dist * 2.2) * u_shadowOpacity * proximityFade;

  // Very subtle breathing modulation on shadow (shadow shrinks as orb inhales)
  float breathShadow = 1.0 - (u_breathingScale - 1.0) * 3.0;
  shadow *= breathShadow;

  shadow = clamp(shadow, 0.0, 1.0);

  // Premultiplied alpha
  vec3 color = u_shadowColor * shadow;
  fragColor = vec4(color, shadow);
}
`,gp=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_noiseTime;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_breathingScale;
uniform float u_microJitter;
uniform float u_audioEnergy;
uniform float u_audioOnset;
uniform float u_lowFreqAmp;
uniform float u_midFreqAmp;
uniform float u_highFreqAmp;
uniform sampler2D u_thicknessMap;
uniform sampler2D u_pearlDepthMap;
uniform float u_pearlDensity;
uniform float u_pearlScatter;
uniform float u_pearlIridescence;
uniform float u_smokeDensity;
uniform float u_internalBloom;

${sa}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = v_uv - u_center;
  p.x *= aspect;
  vec2 localP = p / (u_radius * u_breathingScale);

  vec4 opticalSample = texture(u_thicknessMap, v_uv);
  float shellThickness = max(opticalSample.r - opticalSample.g, 0.0)
    * min(opticalSample.b, opticalSample.a);
  vec4 pearlSample = texture(u_pearlDepthMap, v_uv);
  float pearlCoverage = min(pearlSample.b, pearlSample.a);
  float pearlThickness = max(pearlSample.r - pearlSample.g, 0.0) * pearlCoverage;
  if (pearlThickness <= 0.001 || shellThickness <= 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 texel = 1.0 / u_resolution;
  float depthLeft = texture(u_pearlDepthMap, v_uv - vec2(texel.x, 0.0)).r;
  float depthRight = texture(u_pearlDepthMap, v_uv + vec2(texel.x, 0.0)).r;
  float depthDown = texture(u_pearlDepthMap, v_uv - vec2(0.0, texel.y)).r;
  float depthUp = texture(u_pearlDepthMap, v_uv + vec2(0.0, texel.y)).r;
  vec3 pearlNormal = normalize(vec3(
    (depthLeft - depthRight) * 18.0,
    (depthDown - depthUp) * 18.0,
    1.0
  ));
  float facing = clamp(dot(pearlNormal, normalize(vec3(-0.32, 0.42, 1.0))), 0.0, 1.0);
  vec2 pearlSpace = (localP - vec2(-0.075, -0.025)) / vec2(0.73, 0.62);
  float pearlAngle = -0.20;
  pearlSpace = mat2(
    cos(pearlAngle), -sin(pearlAngle),
    sin(pearlAngle), cos(pearlAngle)
  ) * pearlSpace;
  float flow = noise2(pearlSpace * 1.7 + vec2(u_noiseTime * 0.18, -u_noiseTime * 0.11));
  float phase = clamp(facing * 0.72 + flow * 0.28, 0.0, 1.0);

  vec3 pearlWarm = vec3(0.56, 0.61, 0.68);
  vec3 pearlCool = vec3(0.73, 0.82, 0.92);
  vec3 pearlTone = mix(pearlWarm, pearlCool, phase * u_pearlIridescence + 0.46);
  float pearlMass = pow(clamp(pearlThickness / 0.62, 0.0, 1.0), 0.46)
    * smoothstep(0.08, 0.34, shellThickness);
  float normalSlope = length(pearlNormal.xy);
  float pearlRim = smoothstep(0.10, 0.66, normalSlope)
    * smoothstep(0.015, 0.12, pearlThickness);
  float crown = exp(-pow((pearlSpace.x + 0.31) / 0.56, 2.0)
    - pow((pearlSpace.y - 0.28) / 0.38, 2.0));
  float rightFalloff = 1.0 - smoothstep(0.05, 0.95, pearlSpace.x);
  float pearlShade = mix(0.52, 1.02, facing) + crown * 0.34 + rightFalloff * 0.10;
  vec3 pearlBody = pearlTone * pearlMass * pearlShade * u_pearlDensity * u_pearlScatter;

  vec2 bloomP = pearlSpace - vec2(-0.07, -0.09);
  float verticalBloom = exp(-pow(bloomP.x / 0.12, 2.0) - pow(bloomP.y / 0.42, 2.0));
  float bloomShoulder = exp(-pow((bloomP.x + 0.16) / 0.34, 2.0) - pow((bloomP.y - 0.10) / 0.56, 2.0));
  vec3 livingBloom = mix(vec3(0.42, 0.57, 0.72), vec3(0.78, 0.86, 0.94), verticalBloom)
    * (verticalBloom * 0.58 + bloomShoulder * 0.16) * pearlMass * u_internalBloom;

  float smokeMass = smoothstep(0.10, 0.62, pearlThickness) * mix(0.78, 1.0, flow);
  vec3 smokeBed = mix(vec3(0.18, 0.23, 0.30), vec3(0.34, 0.41, 0.50), pearlThickness)
    * smokeMass * u_smokeDensity;

  float leftWeight = 1.0 - smoothstep(-0.62, 0.72, pearlSpace.x);
  vec3 color = pearlBody * mix(0.66, 0.82, leftWeight)
    + livingBloom * 0.62
    + smokeBed * mix(0.62, 0.42, leftWeight);
  color += mix(vec3(0.30, 0.35, 0.42), vec3(0.80, 0.84, 0.89), facing)
    * pearlRim * 0.42;
  float alpha = clamp(pearlMass * 0.42 + smokeMass * 0.16, 0.0, 0.68) * pearlCoverage;
  fragColor = vec4(color * pearlCoverage, alpha);
}
`,yp=`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform sampler2D u_thicknessMap;
uniform sampler2D u_pearlDepthMap;

float coverageAt(sampler2D map, vec2 uv) {
  vec4 sampleValue = texture(map, uv);
  return min(sampleValue.b, sampleValue.a);
}

vec3 depthNormal(sampler2D map, vec2 uv, float strength) {
  vec2 texel = 1.5 / u_resolution;
  float left = texture(map, uv - vec2(texel.x, 0.0)).r;
  float right = texture(map, uv + vec2(texel.x, 0.0)).r;
  float down = texture(map, uv - vec2(0.0, texel.y)).r;
  float up = texture(map, uv + vec2(0.0, texel.y)).r;
  return normalize(vec3((left - right) * strength, (down - up) * strength, 1.0));
}

void main() {
  vec4 shell = texture(u_thicknessMap, v_uv);
  vec4 pearl = texture(u_pearlDepthMap, v_uv);
  float shellCoverage = min(shell.b, shell.a);
  float pearlCoverage = min(pearl.b, pearl.a);
  if (shellCoverage < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 texel = 2.0 / u_resolution;
  float shellNeighbour = min(min(
    coverageAt(u_thicknessMap, v_uv + vec2(texel.x, 0.0)),
    coverageAt(u_thicknessMap, v_uv - vec2(texel.x, 0.0))
  ), min(
    coverageAt(u_thicknessMap, v_uv + vec2(0.0, texel.y)),
    coverageAt(u_thicknessMap, v_uv - vec2(0.0, texel.y))
  ));
  float pearlNeighbour = min(min(
    coverageAt(u_pearlDepthMap, v_uv + vec2(texel.x, 0.0)),
    coverageAt(u_pearlDepthMap, v_uv - vec2(texel.x, 0.0))
  ), min(
    coverageAt(u_pearlDepthMap, v_uv + vec2(0.0, texel.y)),
    coverageAt(u_pearlDepthMap, v_uv - vec2(0.0, texel.y))
  ));

  float shellEdge = clamp(shellCoverage - shellNeighbour, 0.0, 1.0);
  float pearlEdge = clamp(pearlCoverage - pearlNeighbour, 0.0, 1.0);
  float shellThickness = max(shell.r - shell.g, 0.0) * shellCoverage;
  float pearlThickness = max(pearl.r - pearl.g, 0.0) * pearlCoverage;

  vec3 lightDirection = normalize(vec3(-0.48, 0.66, 0.84));
  vec3 shellNormal = depthNormal(u_thicknessMap, v_uv, 42.0);
  vec3 pearlNormal = depthNormal(u_pearlDepthMap, v_uv, 34.0);
  float shellLight = 0.36 + max(dot(shellNormal, lightDirection), 0.0) * 0.28;
  float pearlLight = 0.46 + max(dot(pearlNormal, lightDirection), 0.0) * 0.30;

  // Rear shell establishes the complete silhouette; the front shell is a
  // restrained value ramp so thickness remains legible without glass tricks.
  vec3 color = vec3(0.24, 0.26, 0.30) * shellLight;
  color += vec3(0.16, 0.17, 0.20) * smoothstep(0.10, 0.68, shellThickness);

  if (pearlCoverage > 0.001) {
    vec3 pearlColor = vec3(0.53, 0.56, 0.61) * pearlLight;
    pearlColor += vec3(0.08) * smoothstep(0.18, 0.66, pearlThickness);
    color = mix(color, pearlColor, 0.92 * pearlCoverage);
  }

  color = mix(color, vec3(0.84, 0.87, 0.91), shellEdge * 0.92);
  color = mix(color, vec3(0.12, 0.13, 0.15), pearlEdge * 0.82);
  fragColor = vec4(color, 1.0);
}
`,_p=.055;class Sp{constructor(i,a={}){M(this,"gl");M(this,"canvas");M(this,"director");M(this,"shadowLayer");M(this,"backgroundLayer");M(this,"volumeDepthPass");M(this,"heroSurfacePass");M(this,"pearlDepthPass");M(this,"structureTurntablePass");M(this,"glassLayer");M(this,"pearlLayer");M(this,"coreLayer");M(this,"highlightLayer");M(this,"structureLayer");M(this,"thicknessTarget");M(this,"pearlDepthTarget");M(this,"sceneTexture");M(this,"profile");M(this,"layerVisibility");M(this,"dpr");M(this,"rafId",null);M(this,"isDisposed",!1);M(this,"renderMode");M(this,"structureStudy");M(this,"structureYaw");M(this,"structurePitch");this.canvas=i,this.profile=a.profile??"idle",this.dpr=a.devicePixelRatio??window.devicePixelRatio??1,this.layerVisibility={...Jo,...a.layers},this.renderMode=a.renderMode??"material",this.structureStudy=a.structureStudy??"front",this.structureYaw=a.structureYaw??0,this.structurePitch=a.structurePitch??0;const u=i.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1});if(!u)throw new Error("WebGL2 not supported");this.gl=u,this.thicknessTarget=new dc(u),this.pearlDepthTarget=new dc(u),this.sceneTexture=new Fd(u),this.volumeDepthPass=new Gd(u),this.heroSurfacePass=new Kd(u),this.pearlDepthPass=new op(u),this.structureTurntablePass=new up(u),this.sceneTexture.setSource(a.background),this.director=new cp(a.dna??gc),this.director.setProfile(this.profile),this.initLayers()}initLayers(){const i=this.gl;this.shadowLayer=new hr(i,vp),this.backgroundLayer=new hr(i,pp),this.glassLayer=new hr(i,dp),this.pearlLayer=new hr(i,gp),this.coreLayer=new hr(i,hp),this.highlightLayer=new hr(i,mp),this.structureLayer=new hr(i,yp)}getCommonUniforms(i){const{canvas:a,dpr:u}=this,f=a.width,y=a.height,w=Math.min(f,y)*Ct.normalizedRadius/u,S=i.floatOffset/y;return{u_resolution:[f/u,y/u],u_time:i.time,u_noiseTime:i.time*_p,u_center:[.5,.5+S],u_radius:w/(f/u),u_breathingScale:i.breathingScale,u_floatOffset:S,u_microJitter:i.microJitter,u_highlightDrift:i.highlightDrift,u_audioEnergy:i.audioEnergy,u_audioOnset:i.audioOnset}}getProfileColors(){return Qo[this.profile]??Qo.idle}getGlassMaterial(){const i=Tt,a=vc[this.profile]??{};return{refractionStrength:i.refractionStrength+(a.refractionStrength??0),fresnelExponent:i.fresnelExponent+(a.refractionIndex??0)*2,fresnelStrength:i.fresnelStrength+(a.fresnelStrength??0),transparency:i.transparency+(a.transparency??0),specularExponent:i.specularExponent+(a.specularExponent??0),specularIntensity:i.specularIntensity+(a.specularIntensity??0),subsurfaceDepth:i.subsurfaceDepth+(a.subsurfaceDepth??0),edgeSoftness:i.edgeSoftness,chromaticAberration:i.chromaticAberration}}getLightingRig(){return qo[this.profile]??qo.idle}drawFrame(){if(this.isDisposed)return;const i=this.gl,a=this.director.tick(),u=this.director.getEmbodimentState(),f=this.getCommonUniforms(a);this.renderMode==="structure"&&(f.u_time=0,f.u_noiseTime=0,f.u_breathingScale=1,f.u_floatOffset=0,f.u_microJitter=0,f.u_audioEnergy=0,f.u_audioOnset=0,f.u_center=[.5,.5]);const y=f.u_radius,w=f.u_center[0],S=f.u_center[1];if(this.renderMode==="structure"&&this.structureStudy!=="front"){i.clearColor(0,0,0,0),i.clearDepth(1),i.clear(i.COLOR_BUFFER_BIT|i.DEPTH_BUFFER_BIT),this.structureTurntablePass.draw({...f,u_structureYaw:this.structureYaw,u_structurePitch:this.structurePitch,u_modelScale:.92},this.structureStudy);return}if(this.thicknessTarget.bind(),i.clearColor(0,0,0,0),i.clear(i.COLOR_BUFFER_BIT),i.disable(i.DEPTH_TEST),this.volumeDepthPass.draw({...f}),this.thicknessTarget.unbind(this.canvas.width,this.canvas.height),this.pearlDepthTarget.bind(),i.clearColor(0,0,0,0),i.clear(i.COLOR_BUFFER_BIT),i.disable(i.DEPTH_TEST),this.pearlDepthPass.draw({...f}),this.pearlDepthTarget.unbind(this.canvas.width,this.canvas.height),this.renderMode==="structure"){i.clearColor(0,0,0,0),i.clear(i.COLOR_BUFFER_BIT),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),this.structureLayer.use(),this.structureLayer.setUniforms({...f}),this.structureLayer.bindTexture("u_thicknessMap",this.thicknessTarget.texture,0),this.structureLayer.bindTexture("u_pearlDepthMap",this.pearlDepthTarget.texture,1),this.structureLayer.draw(),this.heroSurfacePass.bindThicknessMap(this.thicknessTarget.texture,0),this.heroSurfacePass.bindPearlDepthMap(this.pearlDepthTarget.texture,1),this.heroSurfacePass.draw({...f,u_keyLightDirection:[-.48,.66],u_keyLightColor:[.82,.84,.88],u_structureMode:1}),i.disable(i.BLEND);return}i.clearColor(0,0,0,0),i.clear(i.COLOR_BUFFER_BIT),i.enable(i.BLEND),this.layerVisibility.shadow&&(i.blendFunc(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA),this.shadowLayer.use(),this.shadowLayer.setUniforms({...f,u_shadowOffsetY:u.shadowOffsetY,u_shadowSpreadX:u.shadowSpreadX,u_shadowSpreadY:u.shadowSpreadY,u_shadowOpacity:u.shadowOpacity,u_shadowColor:[.02,.04,.08]}),this.shadowLayer.draw()),this.layerVisibility.background&&(i.blendFunc(i.ONE,i.ONE),this.backgroundLayer.use(),this.backgroundLayer.setUniforms({...f,u_bloomColor:u.bloomColor,u_bloomIntensity:u.bloomIntensity,u_bloomRadius:u.bloomRadius,u_rippleColor:u.rippleColor,u_rippleOpacity:u.rippleOpacity,u_rippleSpacing:u.rippleSpacing,u_rippleWidth:.004}),this.backgroundLayer.setInt("u_rippleCount",Math.round(u.rippleCount)),this.backgroundLayer.draw()),this.layerVisibility.glassBody&&(i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),this.glassLayer.use(),this.glassLayer.setUniforms({...f,u_refractionStrength:u.refractionStrength,u_fresnelExponent:u.fresnelExponent,u_fresnelStrength:u.fresnelStrength,u_transparency:u.transparency,u_specularExponent:u.specularExponent,u_specularIntensity:u.specularIntensity,u_subsurfaceDepth:u.subsurfaceDepth,u_edgeSoftness:u.edgeSoftness,u_chromaticAberration:u.chromaticAberration,u_hasSceneTexture:this.sceneTexture.hasSource,u_absorption:_t.absorption,u_opticalDensity:_t.opticalDensity,u_scattering:_t.scattering,u_causticStrength:_t.causticStrength,u_sceneTransmission:_t.sceneTransmission,u_shellReflectivity:_t.shellReflectivity,u_glassColor:u.glassColor,u_rimColor:u.rimColor,u_innerGlowColor:u.coreColor,u_innerGlowIntensity:.6,u_lowFreqAmp:u.lowFreqAmp,u_midFreqAmp:u.midFreqAmp,u_highFreqAmp:u.highFreqAmp,u_keyLightPos:[w+u.keyLightPos[0]*y,S+u.keyLightPos[1]*y],u_keyLightIntensity:u.keyLightIntensity,u_keyLightColor:u.specularColor,u_fillLightPos:[w+u.fillLightPos[0]*y,S+u.fillLightPos[1]*y],u_fillLightIntensity:u.fillLightIntensity,u_fillLightColor:u.glassColor}),this.glassLayer.bindTexture("u_thicknessMap",this.thicknessTarget.texture,0),this.glassLayer.bindTexture("u_sceneTexture",this.sceneTexture.texture,1),this.glassLayer.draw()),this.layerVisibility.glassBody&&(i.blendFunc(i.ONE,i.ONE),this.pearlLayer.use(),this.pearlLayer.setUniforms({...f,u_lowFreqAmp:u.lowFreqAmp,u_midFreqAmp:u.midFreqAmp,u_highFreqAmp:u.highFreqAmp,u_pearlDensity:_t.pearlDensity,u_pearlScatter:_t.pearlScatter,u_pearlIridescence:_t.pearlIridescence,u_smokeDensity:_t.smokeDensity,u_internalBloom:_t.internalBloom}),this.pearlLayer.bindTexture("u_thicknessMap",this.thicknessTarget.texture,0),this.pearlLayer.bindTexture("u_pearlDepthMap",this.pearlDepthTarget.texture,1),this.pearlLayer.draw()),this.layerVisibility.glassBody&&(i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA),this.heroSurfacePass.bindThicknessMap(this.thicknessTarget.texture,0),this.heroSurfacePass.bindPearlDepthMap(this.pearlDepthTarget.texture,1),this.heroSurfacePass.draw({...f,u_keyLightDirection:u.keyLightPos,u_keyLightColor:u.specularColor})),this.layerVisibility.coreLight&&(i.blendFunc(i.ONE,i.ONE),this.coreLayer.use(),this.coreLayer.setUniforms({...f,u_coreColor:u.coreColor,u_coreIntensity:u.coreIntensity,u_coreRadius:u.coreRadius,u_coronaColor:u.glassColor,u_coronaIntensity:u.coronaIntensity,u_coronaRadius:u.coronaRadius,u_lowFreqAmp:u.lowFreqAmp,u_midFreqAmp:u.midFreqAmp,u_highFreqAmp:u.highFreqAmp,u_profile:fp[this.profile]}),this.coreLayer.bindTexture("u_pearlDepthMap",this.pearlDepthTarget.texture,0),this.coreLayer.draw()),this.layerVisibility.highlight&&(i.blendFunc(i.ONE,i.ONE),this.highlightLayer.use(),this.highlightLayer.setUniforms({...f,u_keyHighlightColor:u.specularColor,u_keyHighlightIntensity:u.keyLightIntensity*u.specularIntensity,u_keyHighlightSize:u.keyHighlightSize,u_keyHighlightOffset:[u.keyLightPos[0]*-.18,u.keyLightPos[1]*.22],u_highlightDrift:a.highlightDrift,u_secondaryHighlightColor:u.glassColor,u_secondaryHighlightIntensity:u.secondaryHighlightIntensity,u_secondaryHighlightSize:u.secondaryHighlightSize,u_secondaryHighlightOffset:[.25,-.2],u_maskSoftness:.05}),this.highlightLayer.draw()),i.disable(i.BLEND)}start(){if(this.rafId!==null)return;const i=()=>{this.isDisposed||(this.drawFrame(),this.rafId=requestAnimationFrame(i))};this.rafId=requestAnimationFrame(i)}stop(){this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null)}setProfile(i){this.profile=i,this.director.setProfile(i)}setIdentityDNA(i){this.director.setIdentityDNA(i)}setLayerVisibility(i){this.layerVisibility={...this.layerVisibility,...i}}setAudioInput(i,a=0){this.director.setAudioInput(i,a)}setStructureView(i,a,u){this.structureStudy=i,this.structureYaw=a,this.structurePitch=u}setBackground(i){this.sceneTexture.setSource(i)}resize(i,a){this.canvas.width=i*this.dpr,this.canvas.height=a*this.dpr,this.canvas.style.width=`${i}px`,this.canvas.style.height=`${a}px`,this.gl.viewport(0,0,this.canvas.width,this.canvas.height),this.thicknessTarget.resize(this.canvas.width,this.canvas.height),this.pearlDepthTarget.resize(this.canvas.width,this.canvas.height)}dispose(){this.isDisposed=!0,this.stop(),this.shadowLayer.dispose(),this.backgroundLayer.dispose(),this.volumeDepthPass.dispose(),this.heroSurfacePass.dispose(),this.pearlDepthPass.dispose(),this.structureTurntablePass.dispose(),this.glassLayer.dispose(),this.pearlLayer.dispose(),this.coreLayer.dispose(),this.highlightLayer.dispose(),this.structureLayer.dispose(),this.thicknessTarget.dispose(),this.pearlDepthTarget.dispose(),this.sceneTexture.dispose()}}const wp=({profile:h="idle",size:i=200,audioEnergy:a=0,renderMode:u="material",structureStudy:f="front",structureYaw:y=0,structurePitch:w=0,dna:S,layers:C={},background:E,debug:A=!1,className:N,style:D})=>{const B=xe.useRef(null),z=xe.useRef(null),I=xe.useRef(null);return xe.useEffect(()=>{const O=B.current;if(!O)return;let q;try{q=new Sp(O,{profile:h,dna:S,layers:{...Jo,...C,debug:A},devicePixelRatio:window.devicePixelRatio,background:E,renderMode:u,structureStudy:f,structureYaw:y,structurePitch:w}),q.resize(i,i),q.start(),z.current=q}catch(K){console.error("[LivingOrb] Failed to initialize WebGL renderer:",K);return}return I.current=new ResizeObserver(K=>{for(const re of K){const{width:H,height:de}=re.contentRect;q.resize(H,de)}}),O.parentElement&&I.current.observe(O.parentElement),()=>{var K;(K=I.current)==null||K.disconnect(),q.dispose(),z.current=null}},[]),xe.useEffect(()=>{var O;(O=z.current)==null||O.setProfile(h)},[h]),xe.useEffect(()=>{var O;S&&((O=z.current)==null||O.setIdentityDNA(S))},[S]),xe.useEffect(()=>{var O;(O=z.current)==null||O.setLayerVisibility({...Jo,...C,debug:A})},[C,A]),xe.useEffect(()=>{var O;(O=z.current)==null||O.setAudioInput(a)},[a]),xe.useEffect(()=>{var O;(O=z.current)==null||O.setStructureView(f,y,w)},[f,y,w]),xe.useEffect(()=>{var O;(O=z.current)==null||O.setBackground(E)},[E]),x.jsx("div",{className:N,style:{position:"relative",width:i,height:i,...D},children:x.jsx("canvas",{ref:B,style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",background:"transparent",display:"block"},"aria-hidden":"true"})})},na={"outer-silhouette":"#f4f7fb","crown-edge":"#8fc5ff","lower-fold":"#ffbd86","right-return":"#d3a7ff","inner-mass":"#91e0c2"},xp=({canonicalSrc:h})=>{const[i,a]=xe.useState("overlay"),[u,f]=xe.useState(62),[y,w]=xe.useState(()=>new Set(Yo.layers.map(({id:E})=>E))),S=xe.useMemo(()=>Yo.layers.filter(({id:E})=>i==="silhouette"?E==="outer-silhouette":y.has(E)),[i,y]),C=E=>{w(A=>{const N=new Set(A);return N.has(E)?N.delete(E):N.add(E),N})};return x.jsxs("section",{className:"orb-blueprint","aria-label":"Canonical two-dimensional orb structure blueprint",children:[x.jsx("div",{className:"orb-blueprint__stage",children:x.jsxs("div",{className:"orb-blueprint__frame",children:[x.jsx("img",{src:h,alt:"Frozen 360 pixel canonical Luca Living Orb hero crop",style:{opacity:i==="trace"?0:u/100}}),x.jsxs("svg",{viewBox:"0 0 360 360",role:"img","aria-label":"Traced structural anatomy over the canonical orb",children:[S.map(E=>x.jsx("path",{d:E.path,"data-layer":E.id,fill:E.closed&&i==="trace"?`${na[E.id]}12`:"none",stroke:na[E.id],strokeWidth:E.id==="outer-silhouette"?2.2:1.6,strokeLinecap:"round",strokeLinejoin:"round",vectorEffect:"non-scaling-stroke"},E.id)),i!=="silhouette"&&Yo.landmarks.map(E=>x.jsxs("g",{className:"orb-blueprint__landmark",children:[x.jsx("circle",{cx:E.x,cy:E.y,r:"3"}),x.jsx("circle",{cx:E.x,cy:E.y,r:"7"})]},E.id))]}),x.jsx("span",{className:"orb-blueprint__frame-label",children:"Frozen frame · 360 × 360 · no perspective inference"})]})}),x.jsxs("aside",{className:"orb-blueprint__controls",children:[x.jsxs("div",{children:[x.jsx("p",{className:"orb-lab-v2__eyebrow",children:"2D IDENTITY GATE"}),x.jsx("h2",{children:"Approve the drawing before depth."}),x.jsx("p",{children:"This is the only structure under review. The rejected 3D body is not an input."})]}),x.jsx("div",{className:"orb-blueprint__display","aria-label":"Blueprint display mode",children:["overlay","trace","silhouette"].map(E=>x.jsx("button",{type:"button","aria-pressed":i===E,onClick:()=>a(E),children:E},E))}),i==="overlay"&&x.jsxs("label",{className:"orb-lab-v2__range",children:[x.jsxs("span",{children:["Reference opacity ",x.jsxs("strong",{children:[u,"%"]})]}),x.jsx("input",{type:"range",min:"0",max:"100",value:u,onChange:E=>f(Number(E.target.value))})]}),x.jsx("div",{className:"orb-blueprint__layers",children:Yo.layers.map(E=>x.jsxs("button",{type:"button","aria-pressed":y.has(E.id),onClick:()=>C(E.id),disabled:i==="silhouette"&&E.id!=="outer-silhouette",children:[x.jsx("i",{style:{background:na[E.id]}}),x.jsx("span",{children:E.label})]},E.id))}),x.jsxs("div",{className:"orb-blueprint__rule",children:[x.jsx("strong",{children:"Approval order"}),x.jsx("span",{children:"1. outer silhouette"}),x.jsx("span",{children:"2. crown and lower fold"}),x.jsx("span",{children:"3. right return"}),x.jsx("span",{children:"4. suspended inner mass"})]})]})]})},oa=[{key:"hero",label:"Hero",size:360},{key:"compact",label:"Compact",size:144},{key:"micro",label:"Micro",size:64}],Ep=[{key:"blueprint",label:"2D blueprint"},{key:"evidence",label:"Evidence"}],kp=[{label:"Outer silhouette",detail:"Upper-left crown to lower-right fold must match the frozen crop",status:"pending"},{label:"Front and rear shell",detail:"Independent depth surfaces must read without material effects",status:"pending"},{label:"Suspended inner volume",detail:"Pearl scale, offset, contour and negative space require approval",status:"pending"},{label:"Crown sheet",detail:"Upper overlap must match the reference landmark",status:"pending"},{label:"Lower folded lip",detail:"Fold depth and return path must match the reference landmark",status:"pending"},{label:"Right return",detail:"Narrow structural turn must match the reference landmark",status:"pending"},{label:"Structure freeze",detail:"Materials remain blocked until the neutral assembly is approved",status:"blocked"}];function mc({src:h,label:i}){const{sourceSize:a,cropPixels:u,outputSize:f}=vr.reference,[y,w]=u;return x.jsxs("div",{className:"orb-lab-v2__reference","aria-label":i,style:{width:f,height:f},children:[x.jsx("img",{src:h,alt:"Canonical Luca Living Orb product mockup",style:{width:a[0],height:a[1],transform:`translate(${-y}px, ${-w}px)`}}),x.jsx("div",{className:"orb-lab-v2__reference-tag",children:"Canonical hero crop"})]})}function la({profile:h,tier:i,study:a="front",yaw:u=0,pitch:f=0}){return x.jsx("div",{className:`orb-lab-v2__baseline orb-lab-v2__baseline--${i.key}`,children:x.jsx(wp,{profile:h,size:i.size,audioEnergy:0,renderMode:"structure",structureStudy:a,structureYaw:u,structurePitch:f,layers:Jo})})}const Cp=({referenceSrc:h,canonicalSrc:i,initialProfile:a="idle",initialTier:u="hero",initialView:f="blueprint",className:y})=>{const w=a,[S,C]=xe.useState(u),[E,A]=xe.useState(f),[N,D]=xe.useState(50),[B,z]=xe.useState(50),[I,O]=xe.useState(24),[q,K]=xe.useState(-8),re=xe.useMemo(()=>oa.find(({key:H})=>H===S)??oa[0],[S]);return x.jsxs("main",{className:["orb-lab-v2",y].filter(Boolean).join(" "),children:[x.jsxs("header",{className:"orb-lab-v2__header",children:[x.jsxs("div",{children:[x.jsx("p",{className:"orb-lab-v2__eyebrow",children:"LUCA STRUCTURE LAB · GEOMETRY BEFORE MATERIAL"}),x.jsx("h1",{children:"Craft the Living Orb anatomy first."}),x.jsx("p",{className:"orb-lab-v2__lede",children:"The master mockup is the source of truth. This view removes glass, glow, smoke, refraction, aura and motion so irregular geometry cannot hide behind materials."})]}),x.jsxs("div",{className:"orb-lab-v2__status",role:"status",children:[x.jsx("span",{className:"orb-lab-v2__status-dot"}),x.jsxs("span",{children:[x.jsx("strong",{children:"Structure not approved"}),x.jsx("small",{children:"Materials and VoiceHUD remain blocked"})]})]})]}),x.jsxs("section",{className:"orb-lab-v2__master-strip","aria-label":"Canonical master image",children:[x.jsx("img",{src:h,alt:"Full Luca Living Orb cross-surface product mockup"}),x.jsxs("div",{children:[x.jsx("span",{children:"Canonical source"}),x.jsx("strong",{children:"One frozen anatomy before any material identity is developed"})]})]}),x.jsxs("section",{className:"orb-lab-v2__toolbar","aria-label":"Structure Lab controls",children:[x.jsx("div",{className:"orb-lab-v2__segmented","aria-label":"Review view",children:Ep.map(H=>x.jsx("button",{type:"button","aria-pressed":E===H.key,onClick:()=>A(H.key),children:H.label},H.key))}),x.jsx("div",{className:"orb-lab-v2__toolbar-group",children:x.jsxs("label",{children:[x.jsx("span",{children:"Tier"}),x.jsx("select",{value:S,onChange:H=>C(H.target.value),children:oa.map(H=>x.jsxs("option",{value:H.key,children:[H.label," · ",H.size,"px"]},H.key))})]})})]}),E==="blueprint"&&x.jsx(xp,{canonicalSrc:i}),E==="side-by-side"&&x.jsxs("section",{className:"orb-lab-v2__comparison","aria-label":"Canonical reference and working renderer comparison",children:[x.jsxs("article",{className:"orb-lab-v2__panel",children:[x.jsxs("div",{className:"orb-lab-v2__panel-heading",children:[x.jsx("span",{children:"Target anatomy"}),x.jsx("small",{children:"Approved product mockup"})]}),x.jsx("div",{className:"orb-lab-v2__stage",children:x.jsx(mc,{src:h,label:"Canonical target anatomy"})})]}),x.jsxs("article",{className:"orb-lab-v2__panel",children:[x.jsxs("div",{className:"orb-lab-v2__panel-heading",children:[x.jsx("span",{children:"Neutral structure candidate"}),x.jsxs("small",{children:["Not approved · matte diagnostic · ",re.label]})]}),x.jsx("div",{className:"orb-lab-v2__stage",children:x.jsx(la,{profile:w,tier:re})})]})]}),(E==="turntable"||E==="anatomy")&&x.jsxs("section",{className:"orb-lab-v2__turntable","aria-label":"Rotatable three-dimensional structure study",children:[x.jsxs("div",{className:"orb-lab-v2__turntable-stage",children:[x.jsx(la,{profile:w,tier:re,study:E,yaw:I*Math.PI/180,pitch:q*Math.PI/180}),x.jsx("span",{className:"orb-lab-v2__turntable-badge",children:E==="turntable"?"Closed identity shell":"Shell + suspended mass + membranes"})]}),x.jsxs("aside",{className:"orb-lab-v2__turntable-controls",children:[x.jsxs("div",{children:[x.jsx("p",{className:"orb-lab-v2__eyebrow",children:"STRUCTURE PROTOTYPE"}),x.jsx("h2",{children:E==="turntable"?"Judge the body in rotation.":"Inspect the layer order."}),x.jsx("p",{children:"The hero crop owns the front contour. Side and rear depth are an authored proposal until the turntable is approved."})]}),x.jsxs("label",{className:"orb-lab-v2__range",children:[x.jsxs("span",{children:["Yaw ",x.jsxs("strong",{children:[I,"°"]})]}),x.jsx("input",{type:"range",min:"-180",max:"180",value:I,onChange:H=>O(Number(H.target.value))})]}),x.jsxs("label",{className:"orb-lab-v2__range",children:[x.jsxs("span",{children:["Pitch ",x.jsxs("strong",{children:[q,"°"]})]}),x.jsx("input",{type:"range",min:"-45",max:"45",value:q,onChange:H=>K(Number(H.target.value))})]}),x.jsx("div",{className:"orb-lab-v2__camera-presets","aria-label":"Camera presets",children:[{label:"Front",yaw:0,pitch:0},{label:"Three-quarter",yaw:24,pitch:-8},{label:"Side",yaw:90,pitch:0},{label:"Rear",yaw:180,pitch:0}].map(H=>x.jsx("button",{type:"button",onClick:()=>{O(H.yaw),K(H.pitch)},children:H.label},H.label))}),x.jsxs("div",{className:"orb-lab-v2__turntable-rule",children:[x.jsx("strong",{children:"Identity rule"}),x.jsx("span",{children:"State animation may bend this topology; it may not replace it."})]})]})]}),(E==="overlay"||E==="split")&&x.jsxs("section",{className:"orb-lab-v2__inspection",children:[x.jsxs("div",{className:"orb-lab-v2__inspection-stage",children:[x.jsx(mc,{src:h,label:"Canonical target underlay"}),x.jsx("div",{className:"orb-lab-v2__inspection-baseline",style:E==="overlay"?{opacity:N/100}:{clipPath:`inset(0 ${100-B}% 0 0)`},children:x.jsx(la,{profile:w,tier:re})}),x.jsx("span",{className:"orb-lab-v2__inspection-label orb-lab-v2__inspection-label--target",children:"Target"}),x.jsx("span",{className:"orb-lab-v2__inspection-label orb-lab-v2__inspection-label--baseline",children:"Working renderer"}),E==="split"&&x.jsx("span",{className:"orb-lab-v2__split-line",style:{left:`${B}%`}})]}),x.jsxs("label",{className:"orb-lab-v2__range",children:[x.jsxs("span",{children:[E==="overlay"?"Baseline opacity":"Split position"," ",x.jsxs("strong",{children:[E==="overlay"?N:B,"%"]})]}),x.jsx("input",{type:"range",min:"0",max:"100",value:E==="overlay"?N:B,onChange:H=>E==="overlay"?D(Number(H.target.value)):z(Number(H.target.value))})]}),x.jsx("p",{className:"orb-lab-v2__inspection-note",children:"Judge only silhouette, overlap, depth order, thickness and negative space. Material quality is deliberately unavailable in this stage."})]}),E==="evidence"&&x.jsxs("section",{className:"orb-lab-v2__evidence",children:[x.jsxs("div",{className:"orb-lab-v2__evidence-intro",children:[x.jsx("p",{className:"orb-lab-v2__eyebrow",children:"EVIDENCE, NOT SELF-SCORING"}),x.jsx("h2",{children:"Materials stay closed until the form earns them."}),x.jsx("p",{children:"Every structural part must pass human review against the canonical master before glass engineering resumes."})]}),x.jsx("div",{className:"orb-lab-v2__evidence-list",children:kp.map(H=>x.jsxs("div",{className:"orb-lab-v2__evidence-row",children:[x.jsx("span",{className:`orb-lab-v2__evidence-mark orb-lab-v2__evidence-mark--${H.status}`}),x.jsxs("span",{children:[x.jsx("strong",{children:H.label}),x.jsx("small",{children:H.detail})]}),x.jsx("em",{children:H.status})]},H.label))})]}),x.jsxs("footer",{className:"orb-lab-v2__footer",children:[x.jsx("span",{children:"Current decision"}),x.jsx("strong",{children:"Structure-only gate active. Freeze silhouette, shell layers, pearl, crown, fold and right return before restoring materials."})]})]})},wc=new URLSearchParams(window.location.search),Tp=wc.get("variant")??"idle",Rp=wc.get("tier")??"hero";document.documentElement.style.colorScheme="dark";document.body.style.margin="0";document.body.style.background="#07090d";Nd.createRoot(document.getElementById("root")).render(x.jsx(Cd.StrictMode,{children:x.jsx(Cp,{referenceSrc:"/prototypes/living-orb-reference.png",canonicalSrc:"/prototypes/living-orb-canonical-360.png",initialProfile:Tp,initialTier:Rp,initialView:"blueprint"})}));
