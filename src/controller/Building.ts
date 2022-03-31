export default class Building {
	public fullname: string;
	public shortname: string;
	public address: string;

	constructor(fullname: string, shortname: string, address: string) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.address = address;
	}
}
