import ITextStyleOptions from './ITextStyleOptions'

/**
 * @namespace canvasText
 * @class CanvasText
 * @constructor
 */
export default class TextStyle implements ITextStyleOptions
{
	//Set defaults
	public fontFamily:string = "Verdana";
	public fontWeight:string = "normal";
	public fontSize:string   = "25px";
	public fontColor:string  = "#000";
	public fontStyle:string  = "normal";
	public textAlign:string  = "left";
	public textBaseline:string = "top";
	public lineHeight:string   = "1.5";
	public borderColor:string   = "";
	public borderWeight:string   = "";
	public borderType:Array<number>   = [];
	public width:string   = "1";
	public height:string   = "1";

	constructor(options:ITextStyleOptions = {})
	{
		//Set options
		Object.keys(options).forEach(option => {
			if (typeof this[option] !== 'undefined')
			{
				this[option] = options[option];
			}
		});
	}
}
