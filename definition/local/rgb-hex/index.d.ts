declare namespace rgbHex
{
	interface rgbHexStatic
	{
		(r:string, g:string, b:string):string
		(rgb:string):string
	}
}

declare var rgbHex: rgbHex.rgbHexStatic;

declare module 'rgb-hex' {
	export = rgbHex;
}
