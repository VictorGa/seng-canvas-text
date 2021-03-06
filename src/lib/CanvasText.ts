import ITextStyleOptions from './ITextStyleOptions';
import ITextInfo from './ITextInfo';
import TextStyle from './TextStyle';
import RegexNames from './RegexNames';
import ISize from "./ISize";
import IPoint from "./IPoint";
import BorderType from './BorderType';

/**
 * @namespace canvasText
 * @class CanvasText
 * @constructor
 */
export default class CanvasText
{
	/**
	 * Base style for the text
	 */
	private _style:TextStyle;

	/**
	 * Reference to canvas element
	 */
	private _canvas:HTMLCanvasElement;

	/**
	 * Reference to 2d canvas context
	 */
	private _context:CanvasRenderingContext2D;

	/**
	 * Array containing all different styles found in the text
	 * @type {Array}
	 * @private
	 */
	private _classes:{[selector:string]:CSSStyleRule} = {};

	/**
	 * Contains final position
	 * Good for calculating sizes
	 */
	private _incrementalPos:IPoint;

	/**
	 * Last element's font size
	 */
	private _currentFontSize:number;

	/**
	 * Last element's font size
	 */
	private _lastRegexMatch:string;

	/**
	 * Base style for all text
	 */
	private _baseStyle:ITextStyleOptions;

	/**
	 *
	 * @type {{}}
	 * @private
	 */
	private _matchRegEx:{[regexId:number]:RegExp} = {
		[RegexNames[RegexNames.STYLE]]: /<\s*style=/i,
		[RegexNames[RegexNames.CLASS]]: /<\s*div class=/i,
		[RegexNames[RegexNames.BOLD]]: /<\s*b>/i,
		[RegexNames[RegexNames.BREAKLINE]]: /<\s*br\s*\/>/i,
		[RegexNames[RegexNames.BREAKLINE_INLINE]]: /<\s*brl\s*\/>/i,
	};

	/**
	 * Setter for canvas element
	 * @param canvas
	 */
	set canvas(canvas:HTMLCanvasElement)
	{
		if(typeof canvas !== 'undefined')
		{
			this._canvas = canvas;
			this._context = <any>canvas.getContext("2d");
		}
	}

	/**
	 * Canvas getter
	 * @returns {HTMLCanvasElement}
	 */
	get canvas():HTMLCanvasElement
	{
		return this._canvas;
	}

	/**
	 * constructor
	 * @param textStyleOptions
	 * @param canvas
	 */
	constructor(textStyleOptions:ITextStyleOptions = {}, canvas?:HTMLCanvasElement)
	{
		this._baseStyle = textStyleOptions;
		// this._style = new TextStyle(this._baseStyle);

		if(typeof canvas === 'undefined')
		{
			canvas = document.createElement('canvas');
		}

		this.canvas = canvas;
	}

	/**
	 * Draw text
	 * @param textInfo
	 */
	public drawText(textInfo:ITextInfo):void
	{

		// Clean up canvas
		this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);

		// Reset initial position
		this._incrementalPos = {x: textInfo.x, y: textInfo.y};

		// The main regex. Looks for <style>, <class> or <br /> tags.
		const matches = textInfo.text.match(/<\s*br\s*\/>|<\s*brl\s*\/>|<b>([^>]*)<\s*\/b\s*\>|<\s*div class=["|']([^"|']+)["|']\s*\>([^>]*)<\s*\/div\s*\>|<\s*style=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/style\s*\>|[^<]+/g);

		// Set black background
		//this.drawBackground();

		// Loop the different matches
		matches.forEach(this.renderMatch.bind(this, textInfo, this._incrementalPos));
	}

	/**
	 * Get text size
	 * @returns {{width: number, height: number}}
	 */
	public getSize():ISize
	{
		return {
			width: this._incrementalPos.x,
			height: this._incrementalPos.y
		};
	}

	/**
	 * Get style class
	 * @param className
	 * @returns {CSSStyleRule}
	 */
	private getClassInfo(className:string):string
	{
		if(!this._classes[className])
		{
			// Find class
			const styleSheets = Object.keys(document.styleSheets);
			const ruleName = `.${className}`;
			let foundCssRule = null;
			for(let i = 0; i < styleSheets.length && !foundCssRule; i++)
			{
				const {cssRules} = document.styleSheets[styleSheets[i]];

				for(let j = 0; j < cssRules.length; j++)
				{
					if(cssRules[j].selectorText === ruleName)
					{
						foundCssRule = cssRules[j];
					}
				}
			}

			this._classes[className] = foundCssRule;
		}

		if(typeof this._classes[className] === 'undefined')
		{
			console.error(`Class name ${className} does not exist --- Canvas Text`)
		}

		return this._classes[className].style.cssText;
	}

	/**
	 * Set font properties in context
	 * @param style
	 */
	private setContextProperties(style:TextStyle):void
	{
		//Set font props
		this._context.fillStyle = style.fontColor;

		// Set the size & font family.
		this._context.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;

		this._currentFontSize = parseInt(style.fontSize, 10);
		this._context.textBaseline = style.textBaseline;
		this._context.textAlign = style.textAlign;
	}

	/**
	 * Render text match
	 * @param textInfo
	 * @param pos
	 * @param match
	 */
	private renderMatch(textInfo:ITextInfo, pos:{x:number, y:number}, match:string):void
	{
		// Save current state
		this._context.save();

		// Reset style props
		let textStyleProps = new TextStyle(this._baseStyle);

		// Match with the regular expression
		let continueParse = true;
		let text = match;

		const regexFound = (<any>Object.keys(this._matchRegEx)).find(regexName => this._matchRegEx[regexName].test(match));

		if(regexFound)
		{
			this._lastRegexMatch = regexFound;

			switch(regexFound)
			{
				case RegexNames[RegexNames.BOLD]:
					text = this.parseBoldExp(match, textStyleProps);
					break;
				case RegexNames[RegexNames.STYLE]:
					text = this.parseStyleExp(match, textStyleProps);
					break;
				case RegexNames[RegexNames.CLASS]:
					text = this.parseClassExp(match, textStyleProps);
					break;
				case  RegexNames[RegexNames.BREAKLINE]:
					// Check if current fragment is a line break.
					pos.y += this._currentFontSize + parseFloat(textStyleProps.lineHeight) * parseInt(textStyleProps.fontSize, 10);
					console.log('breakline', pos.y, textStyleProps.fontSize, textStyleProps.lineHeight, this._currentFontSize, parseFloat(textStyleProps.lineHeight) * parseInt(textStyleProps.fontSize, 10) + this._currentFontSize);
					pos.x = textInfo.x;
					continueParse = false;
					break;
				case  RegexNames[RegexNames.BREAKLINE_INLINE]:
					// Check if current fragment is a line break.
					pos.y += parseFloat(textStyleProps.lineHeight) * parseInt(textStyleProps.fontSize, 10);
					pos.x = textInfo.x;
					continueParse = false;
					break;
				default:
					text = match;
					break;
			}
		}

		//Stop execution at this point
		if(!continueParse) return;

		this.setContextProperties(textStyleProps);

		// Html tag is empty
		const isEmpty = text === "";

		// Reset textLines;
		let textLines = [];

		// Clear javascript code line breaks.
		text = text.replace(/\s*\n\s*/g, " ");

		// Check for text modifications
		switch(textStyleProps.textTransform)
		{
			case 'uppercase':
				text = text.toUpperCase();
				break;
			case 'lowercase':
				text = text.toLowerCase();
				break;
			case 'capitalize':
				console.error('capitalize is not supported');
				break;
			default:
				break;
		}

		if(typeof textInfo.boxWidth !== 'undefined')
		{
			// If returns true, it means we need a line break.
			if(this.isLineBreak(text, (textInfo.boxWidth + textInfo.x), pos.x))
			{
				// Split text by words.
				const splittedText = this.clean(text).split(" ");
				// If there's only one word we don't need to make more checks.
				if(splittedText.length == 1)
				{
					textLines.push({text: this.clean(text) + " ", linebreak: true});
				}
				else
				{
					// Reset vars.
					let xAux = pos.x;
					let line = 0;
					textLines[line] = {text: undefined, linebreak: false};

					// Loop words.
					for(let k = 0; k < splittedText.length; k++)
					{
						// Replace just space at the beginning
						splittedText[k] = splittedText[k].trim();
						splittedText[k] += " ";

						// Check if the current text fits into the current line.
						if(!this.isLineBreak(splittedText[k], (textInfo.boxWidth + textInfo.x), xAux))
						{
							// Current text fit into the current line. So we save it
							// to the current textLine.
							if(textLines[line].text == undefined)
							{
								textLines[line].text = splittedText[k];
							}
							else
							{
								textLines[line].text += splittedText[k];
							}

							xAux += this._context.measureText(splittedText[k]).width;
						}
						else
						{
							// Current text doesn't fit into the current line.
							// We are doing a line break, so we reset xAux
							// to initial x value.
							xAux = textInfo.x;
							if(textLines[line].text !== undefined)
							{
								line++;
							}

							textLines[line] = {text: splittedText[k], linebreak: true};
							xAux += this._context.measureText(splittedText[k]).width;
						}
					}
				}
			}
		}

		// if textLines.length == 0 it means we doesn't need a linebreak.
		if(textLines.length == 0)
		{
			textLines.push({text: this.clean(text) + " ", linebreak: false});
		}

		// Let's draw the text
		for(let n = 0; n < textLines.length; n++)
		{
			// Start a new line.
			if(textLines[n].linebreak)
			{
				pos.y += parseFloat(textStyleProps.lineHeight) * parseInt(textStyleProps.fontSize, 10);
				pos.x = textInfo.x;
			}
			this._context.fillText(textLines[n].text, pos.x, pos.y);
			// Increment X position based on current text measure.
			pos.x += this._context.measureText(textLines[n].text).width;
		}

		if(textStyleProps.borderType.length)
		{
			textStyleProps.borderType.forEach(type => {
				this._context.beginPath();
				switch(type)
				{
					case BorderType.BOTTOM:
						pos.y +=  parseFloat(textStyleProps.lineHeight) * parseInt(textStyleProps.fontSize, 10);
						this._context.moveTo(0, pos.y);
						this._context.lineTo(isEmpty ? parseFloat(textStyleProps.width) : pos.x, pos.y);
						break;
					case BorderType.TOP:
						this._context.moveTo(0, pos.y);
						this._context.lineTo(isEmpty ? parseFloat(textStyleProps.width) : pos.x , pos.y);
						break;
				}

				pos.y -= parseFloat(textStyleProps.borderWeight)*2;
				this._currentFontSize = 0;//parseFloat(textStyleProps.borderWeight)*2;
				this._context.lineWidth = parseFloat(textStyleProps.borderWeight);
				this._context.strokeStyle = textStyleProps.borderColor;

				this._context.stroke();
			});
		}

		this._context.restore();
	}

	/**
	 * Parse bold match expression
	 * @param matchValue
	 * @param textStyleProps
	 * @returns {string}
	 */
	private parseBoldExp(matchValue:string, textStyleProps:TextStyle):string
	{
		const innerMatch = matchValue.match(/<b>([^>]+)<\s*\/b\s*\>/);
		textStyleProps.fontWeight = 'bold';

		return innerMatch[1];
	}

	/**
	 * Parse style match expression
	 * @param matchValue
	 * @param textStyleProps
	 * @returns {string}
	 */
	private parseStyleExp(matchValue:string, textStyleProps:TextStyle):string
	{
		const innerMatch = matchValue.match(/<\s*style=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/style\s*\>/);

		// innerMatch[1] contains the properties of the attribute.
		const properties = innerMatch[1].split(";");

		// Apply styles for each property.
		this.setStyleProps(properties, textStyleProps);

		return innerMatch[2];
	}

	/**
	 * Parse style match expression
	 * @param matchValue
	 * @param textStyleProps
	 * @returns {string}
	 */
	private parseClassExp(matchValue:string, textStyleProps:TextStyle):string
	{
		const innerMatch = matchValue.match(/<\s*div class=["|']([^"|']+)["|']\s*\>([^>]*)<\s*\/div\s*\>/);

		// innerMatch[1] contains the properties of the attribute.
		const properties = this.getClassInfo(innerMatch[1]).replace(/\s+/g, '').split(";");

		// Apply styles for each property.
		this.setStyleProps(properties, textStyleProps);
		innerMatch[2] = "" + innerMatch[2];
		// console.log(innerMatch[2].split("").join(String.fromCharCode(8202)));
		return innerMatch[2].split("").join(String.fromCharCode(8202));
	}

	/**
	 * Set textStyleProps object with new properties
	 * @param properties
	 * @param textStyleProps
	 */
	private setStyleProps(properties:Array<string>, textStyleProps:TextStyle):void
	{
		// Apply styles for each property.
		for(let j = 0; j < properties.length; j++)
		{
			// Each property have a value. We split them.
			const property = properties[j].split(":");
			// A simple check.
			if(this.validProperty(property[0]) || this.validProperty(property[1]))
			{
				// Wrong property name or value. We jump to the
				// next loop.
				continue;
			}
			// Again, save it into friendly-named variables to work comfortably.
			const propertyName = property[0];
			const propertyValue = property[1];
			let values =  propertyValue.split(' ');

			switch(propertyName)
			{
				case "font":
					// proFont = propertyValue;
					break;
				case "text-transform":
					textStyleProps.textTransform = propertyValue;
					break;
				case "line-height":
					textStyleProps.lineHeight = propertyValue;
					break;
				case "font-family":
					textStyleProps.fontFamily = propertyValue;
					break;
				case "font-weight":
					textStyleProps.fontWeight = propertyValue;
					break;
				case "font-size":
					textStyleProps.fontSize = propertyValue;
					break;
				case "font-style":
					textStyleProps.fontStyle = propertyValue;
					break;
				case "color":
					textStyleProps.fontColor = propertyValue;
					break;
				case "text-align":
					textStyleProps.textAlign = this.clean(propertyValue);
					break;
				case "width":
					textStyleProps.width = propertyValue;
					break;
				case "height":
					textStyleProps.height = propertyValue;
					break;
				case "border-bottom":
					if(values.length >= 1)
					{
						textStyleProps.borderWeight = values[0];
					}
					textStyleProps.borderType.push(BorderType.BOTTOM);
					textStyleProps.borderColor = `#${this.rgbHex(values.pop())}`;
					break;
				case "border-top":
					if(values.length >= 1)
					{
						textStyleProps.borderWeight = values[0];
					}
					textStyleProps.borderType.push(BorderType.TOP);
					textStyleProps.borderColor = `#${this.rgbHex(values.pop())}`;
					break;
				case "border-bottom-width":
					if(values.length >= 1)
					{
						textStyleProps.borderWeight = values[0];
					}
					textStyleProps.borderType.push(BorderType.BOTTOM);
					break;
				case "border-top-width":
					if(values.length >= 1)
					{
						textStyleProps.borderWeight = values[0];
					}
					textStyleProps.borderType.push(BorderType.TOP);
					break;
				case "border-bottom-color":
					textStyleProps.borderColor = `#${this.rgbHex(values[0])}`;
					break;
				case "border-top-color":
					textStyleProps.borderColor = `#${this.rgbHex(values[0])}`;
					break;
			}
		}
	}

	/**
	 * Draw background for high res texturing
	 */
	private drawBackground():void
	{
		this._context.fillStyle = 'black';
		this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
	}

	/**
	 * Is not an empty string?
	 * @param propertyValue
	 * @returns {boolean}
	 */
	private validProperty(propertyValue:string):boolean
	{
		return propertyValue.replace(/^\s+|\s+$/, '').length == 0;
	}

	/**
	 * Returns if there is need for a line break
	 * @param text
	 * @param boxWidth
	 * @param x
	 * @returns {boolean}
	 */
	private isLineBreak(text, boxWidth, x):boolean
	{
		return (this._context.measureText(text).width + x > boxWidth);
	};

	/**
	 * Clean white spaces
	 * @param text
	 * @returns {any}
	 */
	private clean(text):string
	{
		var ws, i;
		const _text = text.replace(/^\s\s*/, '');
		ws = /\s/;
		i = _text.length;
		while(ws.test(_text.charAt(--i)))
		{
			continue;
		}
		return _text.slice(0, i + 1);
	}

	/**
	 * Convert rgb to hex
	 * @param rgb
	 * @returns {string}
	 */
	private rgbHex(rgb:string):string
	{
		const res = rgb.match(/\b\d{1,3}\b/g).map(Number);
		return ((res[2] | res[1] << 8 | res[0] << 16) | 1 << 24).toString(16).slice(1);
	}
}
