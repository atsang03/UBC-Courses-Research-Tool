export default class Room {
	private fullname: string;
	private shortname: string;
	private room_number: string;
	private room_name: string;
	private address: string;
	private lat: number;
	private lon: number;
	private seats: number;
	private type: string;
	private furniture: string;
	private href: string;
	private dataID: string;

	constructor(fullname: string, shortname: string, room_number: string, room_name: string, address: string,
		lat: number, lon: number, seats: number, type: string, furniture: string, href: string, dataID: string) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.room_number = room_number;
		this.room_name = room_name;
		this.address = address;
		this.lat = lat;
		this.lon = lon;
		this.seats = seats;
		this.type = type;
		this.furniture = furniture;
		this.href = href;
		this.dataID = dataID;
	}
}
