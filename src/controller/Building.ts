export default class Building {
	public fullname: string;
	public shortname: string;
	public address: string;
	public lon: number;
	public lat: number;

	constructor(fullname: string, shortname: string, address: string, lon: number, lat: number) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.address = address;
		this.lon = lon;
		this.lat = lat;
	}
}
