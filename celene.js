/*;
	@module-license:
		The MIT License (MIT)
		@mit-license

		Copyright (@c) 2017 Richeve Siodina Bebedor
		@email: richeve.bebedor@gmail.com

		Permission is hereby granted, free of charge, to any person obtaining a copy
		of this software and associated documentation files (the "Software"), to deal
		in the Software without restriction, including without limitation the rights
		to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
		copies of the Software, and to permit persons to whom the Software is
		furnished to do so, subject to the following conditions:

		The above copyright notice and this permission notice shall be included in all
		copies or substantial portions of the Software.

		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
		IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
		FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
		AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
		LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
		OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		SOFTWARE.
	@end-module-license

	@module-configuration:
		{
			"package": "celene",
			"path": "celene/celene.js",
			"file": "celene.js",
			"module": "celene",
			"author": "Richeve S. Bebedor",
			"eMail": "richeve.bebedor@gmail.com",
			"repository": "https://github.com/volkovasystems/celene.git",
			"test": "celene-test.js",
			"global": true
		}
	@end-module-configuration

	@module-documentation:
		Ensure selenium server.
	@end-module-documentation

	@include:
		{
			"dxcom": "dxcom",
			"letgo": "letgo",
			"xw8": "xw8",
			"zelf": "zelf"
		}
	@end-include

	@todo:
		Add max PID count checking.

		Usually, an app/service can have 1 or more PID running at the same time
		which is associated to a name, based on the command.

		When the max PID count reaches threshold, it only means that
		the app/service has duplicates running and possibly the other
		app/service does not run well.

		So to fix this, we will check for the max PID count,
		if the threshold is out of bounds then we can shutdown all
		services then restart things again.

		These may have adverse effects on the current session of the service
		but we have to choose between fixing non-working duplicate service
		that is hoggering the memory or prioritising the current session.
	@end-todo
*/

const dxcom = require( "dxcom" );
const letgo = require( "letgo" );
const xw8 = require( "xw8" );
const zelf = require( "zelf" );

const SELENIUM_STATUS_CHECK_COMMAND = "curl --output /dev/null --silent --fail http://localhost:4444/wd/hub/status";

const celene = function celene( synchronous ){
	/*;
		@meta-configuration:
			{
				"synchronous": "boolean"
			}
		@end-meta-configuration
	*/

	if( synchronous === true ){
		try{
			if( xw8( SELENIUM_STATUS_CHECK_COMMAND, true, true ) ){
				dxcom( "selenium-standalone start", true );

				return xw8( SELENIUM_STATUS_CHECK_COMMAND, false, true );
			}

			return true;

		}catch( error ){
			process.emitWarning( new Error( `cannot ensure selenium server, ${ error.stack }` ) );

			return false;
		}

	}else{
		let catcher = xw8.bind( zelf )( SELENIUM_STATUS_CHECK_COMMAND, true )
			.then( function done( error, result ){
				if( error instanceof Error ){
					return catcher.pass( new Error( `cannot ensure selenium server, ${ error.stack }` ), false );
				}

				if( result ){
					return catcher.through( "start-selenium-server" );
				}

				return catcher.pass( null, true );
			} )
			.flow( "start-selenium-server", function startSeleniumServer( ){
				return dxcom( "selenium-standalone start" )( function done( error, result ){
					if( error instanceof Error ){
						return catcher.pass( new Error( `cannot ensure selenium server, ${ error.stack }` ), false );
					}

					if( result ){
						return catcher.through( "check-selenium-server" );
					}

					return catcher.pass( null, false );
				} );
			} )
			.flow( "check-selenium-server", function checkSeleniumServer( ){
				return xw8( SELENIUM_STATUS_CHECK_COMMAND, false )( function done( error, result ){
					if( error instanceof Error ){
						return catcher.pass( new Error( `cannot ensure selenium server, ${ error.stack }` ), false );
					}

					return catcher.pass( null, result );
				} );
			} );

		return catcher;
	}
};

module.exports = celene;
