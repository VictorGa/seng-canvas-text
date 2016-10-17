import ITextStyleOptions from './ITextStyleOptions';
import ITextInfo from './ITextInfo';
import TextStyle from './TextStyle';
import RegexNames from './RegexNames';
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
	private _classes:Array<TextStyle> = [];

	/**
	 *
	 * @type {{}}
	 * @private
	 */
	private _matchRegEx:{[regexId:number]:RegExp} = {
		[RegexNames[RegexNames.STYLE]]: /<\s*style=/i,
		[RegexNames[RegexNames.CLASS]]: /<\s*class=/i,
		[RegexNames[RegexNames.BREAKLINE]]: /<\s*br\s*\/>/i,
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
			this._context = canvas.getContext("2d");
		}
	}

	/**
	 * constructor
	 * @param textStyleOptions
	 * @param canvas
	 */
	constructor(textStyleOptions:ITextStyleOptions = {}, canvas?:HTMLCanvasElement)
	{
		this._style = new TextStyle(textStyleOptions);
		this.canvas = canvas;
	}

	/**
	 * Draw text
	 * @param textInfo
	 */
	public drawText(textInfo:ITextInfo):void
	{
		//Set default style properties
		this.setContextProperties(this._style);

		// The main regex. Looks for <style>, <class> or <br /> tags.
		const matches = textInfo.text.match(/<\s*br\s*\/>|<\s*class=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/class\s*\>|<\s*style=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/style\s*\>|[^<]+/g);
		let incrementalPos = {x: textInfo.x, y: textInfo.y};

		//Loop the different matches
		matches.forEach(this.renderMatch.bind(this, textInfo, incrementalPos));
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

		this._context.textBaseline = this._style.textBaseline;
		this._context.textAlign = this._style.textAlign;
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
		let textStyleProps = new TextStyle();

		// Match with the regular expression
		let continueParse = true;
		let text = match;

		const regexFound = Object.keys(this._matchRegEx).find(regexName => this._matchRegEx[regexName].test(match));

		if(regexFound)
		{
			switch(regexFound)
			{
				case RegexNames[RegexNames.STYLE]:
					text = this.parseStyleExp(match, textStyleProps);
					break;
				case  RegexNames[RegexNames.BREAKLINE]:
					// Check if current fragment is a line break.
					pos.y += parseInt(this._style.lineHeight, 10) * 1.5;
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

		// Reset textLines;
		let textLines = [];

		// Clear javascript code line breaks.
		text = text.replace(/\s*\n\s*/g, " ");

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

		this.setContextProperties(textStyleProps);

		// Let's draw the text
		for(let n = 0; n < textLines.length; n++)
		{
			// Start a new line.
			if(textLines[n].linebreak)
			{
				pos.y += parseInt(this._style.lineHeight, 10) * 1.5;
				pos.x = textInfo.x;
			}
			this._context.fillText(textLines[n].text, pos.x, pos.y);
			// Increment X position based on current text measure.
			pos.x += this._context.measureText(textLines[n].text).width;
		}

		this._context.restore();
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

			switch(propertyName)
			{
				case "font":
					// proFont = propertyValue;
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
			}
		}
		return innerMatch[2];
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
}
