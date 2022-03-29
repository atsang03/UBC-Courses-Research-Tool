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

export default class InsightFacade implements IInsightFacade {
	private datasetList: any[] = [];
	private secList: any[] = [];
	// Function to add dataset
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.includes("_")) {
			throw new InsightError("invalid id");
		}
		if (kind === InsightDatasetKind.Courses) {
			return await this.addCourse(id, content, kind);
		} else if (kind === InsightDatasetKind.Rooms) {
			return await this.addRooms(id, content, kind);
		}
		return [];
	}

	private async addCourse(id: string, content: string, kind: InsightDatasetKind): Promise<string[]>{
		let idList: string[] = [];
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
		this.datasetList.forEach((element) => idList.push(element.id));
		fs.writeFileSync(`data/${id}`, JSON.stringify(this.secList));
		return Promise.resolve(idList);
	}

	public async addRooms(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let idList: string[] = [];
		let promises: Array<Promise<any> | undefined > = [];
		let zip = new JSZip();
		let tbody: any;
		let counter: number = 0;
		const aPromise = await zip.loadAsync(content, {base64: true});
		promises.push(aPromise.file("rooms/index.htm")?.async("string").then((filecontent) => {
			let jFile: any = parse(filecontent);
			// Get tbody node, aka the table
			tbody = this.roomsDFS(jFile);
		}));
		await Promise.all(promises);
		this.bodyDFS(tbody);
		return [];
	}

	private bodyDFS(tbody: any) {
		return [];
	}

	private roomsDFS(jFile: any) {
		let result: any;
		jFile.childNodes.forEach((node: any) => {
			if (node.nodeName === "html") {
				result = this.DFShelper(node);
			}
		});
		if (result !== null) {
			return result;
		} else {
			throw new InsightError("invalid dataset");
		}
	}

	private DFShelper(html: any) {
		let result: any;
		if (html.nodeName === "tbody") {
			return html;
		}
		if (html.childNodes === undefined) {
			return null;
		}
		if (html.childNodes === null) {
			return null;
		}
		for (const child of html.childNodes) {
			result = this.DFShelper(child);
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

	// Function to remove dataset
	public removeDataset(id: string): Promise<string> {
		if (id.includes("_")) {
			throw new InsightError("invalid id");
		} else if (!fs.existsSync(`data/${id}`)) {
			throw new NotFoundError("No dataset with this id found");
		}
		fs.unlinkSync(`data/${id}`);
		this.datasetList.forEach((element) => {
			if (element.id === id) {
				element.remove();
			}
		});
		this.secList.forEach((element) => {
			if (element.dataID === id) {
				element.remove();
			}
		});
		return Promise.resolve(id);
	}


}
