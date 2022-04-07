import JSZip, {loadAsync} from "jszip";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import Section from "./Section";
import * as fs from "fs";
import Query from "./Query";
import {ChildNode, Document, Element, Node, ParentNode, parse} from "parse5";
import Building from "./Building";
import Room from "./Room";
import * as http from "http";

export default class InsightFacade implements IInsightFacade {
	private datasetList: any[] = [];
	private secList: any[] = [];
	private roomList: any[] = [];
	private buildingList: any[] = [];
	private idList: string[] = [];
	// Function to add dataset
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.includes("_") || id.trim().length === 0 || this.idList.includes(id)) {
			return Promise.reject(new InsightError("invalid id/ already used id"));
		}
		this.secList = [];
		this.buildingList = [];
		if (kind === InsightDatasetKind.Courses) {
			return await this.addCourse(id, content, kind);
		} else if (kind === InsightDatasetKind.Rooms) {
			return await this.addRooms(id, content, kind);
		}
		return [];
	}

	private async addCourse(id: string, content: string, kind: InsightDatasetKind): Promise<string[]>{
		let promises: Array<Promise<any>> = [];
		let zip = new JSZip();
		let counter: number = 0;
		const aPromise = await zip.loadAsync(content, {base64: true});
		aPromise.folder("courses")?.forEach((async (relativePath, file) => {
			promises.push(file.async("string").then((filecontent) => {
				let jFile: any = JSON.parse(filecontent);
				for (const element of jFile.result) {
					if (element.Section !== null) {
						counter++;
						this.secList.push(new Section(element.Subject, element.Course, element.Avg,
							element.Professor, element.Title, element.Pass, element.Fail, element.Audit,
							element.id, element.Year, id));
					}
				}
			}));
		}));
		await Promise.all(promises);
		this.datasetList.push({id: id, kind: kind, numRows: counter});
		this.datasetList.forEach((element) => {
			this.idList.push(element.id);
		});
		fs.writeFileSync(`data/${id}`, JSON.stringify(this.secList));
		return Promise.resolve(this.idList);
	}

	public async addRooms(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let idList: string[] = [];
		let promises2: Array<Promise<any> | undefined > = [];
		let promises: Array<Promise<any> | undefined > = [];
		let zip = new JSZip();
		let tbody: any;
		let hbody: any;
		let counter: number = 0;
		const aPromise = await zip.loadAsync(content, {base64: true});
		promises.push(aPromise.file("rooms/index.htm")?.async("string").then((filecontent) => {
			let jFile: any = parse(filecontent);
			// Get tbody node, aka the table
			tbody = this.htmlDFS(jFile);
		}));
		await Promise.all(promises);
		this.buildingDFS(tbody);
		this.buildingList.forEach((building) => {
			promises2.push(this.getCoordinates(building[1].address, building));
		});
		await Promise.all(promises2);
		this.buildingList.forEach((building) => {
			let filepath = "rooms" + building[0].substring(1);
			promises.push(aPromise.file(filepath)?.async("string").then((filecontent) => {
				let hFile: any = parse(filecontent);
				hbody = this.htmlDFS(hFile);
				if (hbody !== undefined) {
					this.roomDFS(hbody, building[1], id);
				}
			}));
		});
		await Promise.all(promises);
		this.datasetList.push({id: id, kind: kind, numRows: this.roomList.length});
		this.datasetList.forEach((element) => idList.push(element.id));
		fs.writeFileSync(`data/${id}`, JSON.stringify(this.roomList));
		this.roomList = [];
		return Promise.resolve(idList);
	}

	/*
	get room levle info
	*/
	private roomDFS(tbody: any, building: Building, id: string) {
		if (tbody.nodeName === "tr") {
			let num;
			let capacity;
			let furniture;
			let type;
			let href;
			tbody.childNodes.forEach((tr: any) => {
				if (tr.nodeName === "td") {
					let tclass = tr.attrs[0].value;
					if (tclass === "views-field views-field-field-room-number") {
						for(const child of tr.childNodes) {
							if (child.nodeName === "a") {
								num = child.childNodes[0].value.trim();
							}
						}
					}
					if (tclass === "views-field views-field-field-room-capacity") {
						capacity = tr.childNodes[0].value.trim();
					}
					if (tclass === "views-field views-field-field-room-furniture") {
						furniture = tr.childNodes[0].value.trim();
					}
					if (tclass === "views-field views-field-field-room-type") {
						type = tr.childNodes[0].value.trim();
					}
					if (tclass === "views-field views-field-nothing") {
						for(const child of tr.childNodes) {
							if (child.nodeName === "a") {
								href = child.attrs[0].value;
							}
						}
					}
				}
			});
			if (num !== undefined && capacity !== undefined && furniture !== undefined && type !== undefined
				&& href !== undefined) {
				this.roomList.push(new Room(building.shortname, building.fullname, num, building.fullname
					+ num,  building.address,  building.lat, building.lon,
				Number(capacity), type, furniture, href, id));
			}
		} else {
			if (tbody.childNodes === undefined || tbody.childNodes === null) {
				return null;
			}
			for (const child of tbody.childNodes) {
				this.roomDFS(child,building, id);
			}
		}
	}

	// get building level info
	private buildingDFS(tbody: any) {
		let coords: Array<Promise<any>> = [];
		if (tbody.nodeName === "tr") {
			let codevalue: string;
			let titlevalue: string;
			let addressvalue: string;
			let href: string;
			tbody.childNodes.forEach((tr: any) => {
				if (tr.nodeName === "td") {
					let tclass = tr.attrs[0].value;
					if (tclass === "views-field views-field-field-building-code") {
						codevalue = tr.childNodes[0].value.trim();
					}
					if (tclass === "views-field views-field-title") {
						tr.childNodes.forEach((child: any) => {
							if (child.nodeName === "a") {
								titlevalue = child.childNodes[0].value.trim();
							}
						});
					}
					if (tclass === "views-field views-field-field-building-address") {
						addressvalue =  tr.childNodes[0].value.trim();
					}
					if (tclass === "views-field views-field-nothing") {
						tr.childNodes.forEach((child: any) => {
							if (child.attrs !== null && child.attrs !== undefined) {
								if (child.attrs[0].name === "href") {
									href = child.attrs[0].value;
								}
							}
						});
					}
					if (codevalue !== undefined && titlevalue !== undefined && addressvalue !== undefined
						&& href !== undefined) {
						this.buildingList.push([href, new Building(codevalue, titlevalue, addressvalue, 0,
							0)]);
						// this.buildingList.push([href, new Building(codevalue, titlevalue, addressvalue, coords[0],
						// 	coords[1])]);
					}
				}
			});
		} else {
			if (tbody.childNodes === undefined || tbody.childNodes === null) {
				return null;
			}
			for (const child of tbody.childNodes) {
				this.buildingDFS(child);
			}
		}
	}

	private htmlDFS(jFile: any) {
		let result: any;
		jFile.childNodes.forEach((node: any) => {
			if (node.nodeName === "html") {
				result = this.htmlDFShelper(node);
			}
		});
		if (result !== null) {
			return result;
		} else {
			return Promise.reject(new InsightError("invalid dataset"));
		}
	}

	private htmlDFShelper(html: any) {
		let result: any;
		if (html.nodeName === "table") {
			return html;
		}
		if (html.childNodes === undefined) {
			return null;
		}
		if (html.childNodes === null) {
			return null;
		}
		for (const child of html.childNodes) {
			result = this.htmlDFShelper(child);
			if (result !== null && result !== undefined) {
				return result;
			}
		}
	}


		// Function to list datasets in this instance of insightFacade
	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasetList);
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		let input: Query = new Query(query);
		return input.performQuery();
	}

	public removeDataset(id: string): Promise<string> {
		if (id.includes("_") || id.trim().length === 0) {
			return Promise.reject(new InsightError("invalid id"));
		} else if (!fs.existsSync(`data/${id}`)) {
			return Promise.reject(new NotFoundError("No dataset with this id found"));
		}
		fs.unlinkSync(`data/${id}`);
		this.datasetList = this.datasetList.filter((ele) => {
			return ele["id"] !== id;
		});
		this.idList = this.idList.filter((ele) => {
			return ele !== id;
		});
		return Promise.resolve(id);
	}

	// http://cs310.students.cs.ubc.ca:11316/api/v1/project_team<TEAM NUMBER>/<ADDRESS>
	public getCoordinates(address: string, building: Building): Promise<number[]> {
		return new Promise((resolve) => {
			address = encodeURI(address);
			let latlon: number[] = [];
			http.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team659/" + address,
				(readable) => {
					readable.on("data", (chunk) => {
						let index = this.buildingList.indexOf(building);
						let object = JSON.parse(chunk.toString());
						if (object.error === undefined) {
							this.buildingList[index][1].lat = object.lat;
							this.buildingList[index][1].lon = object.lon;
							resolve([object.lat, object.lon]);
						} else {
							this.buildingList.splice(this.buildingList.indexOf(building) , 1);
							resolve([]);
						}
					});
				});
		});
	}
}
