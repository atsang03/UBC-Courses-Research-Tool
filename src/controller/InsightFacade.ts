import JSZip, {loadAsync} from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult} from "./IInsightFacade";
import Section from "../../../project_team659/src/controller/Section";


export default class InsightFacade implements IInsightFacade {
	private datasetList: any[] = [];
	private secList: any[] = [];

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let counter = 0;
		let sub: string;
		let avg: number;
		let prof: string;
		let title: string;
		let pass: number;
		let fail: number;
		let audit: number;
		let cid: string;
		let uuid: string;
		let year: number;
		let idList: string[] = [];
		let zip = new JSZip();
		zip.loadAsync(content, {base64: true}); // Store data as JSzip
		zip.forEach((relativePath, file) => { // For each Zip object
			let cont: Promise<"string">;
			cont = file.async("string").then((filecontent) => JSON.parse(filecontent,
				(key, value) => {
					switch (key) {
						case "Subject:": sub = value;
						case "Course": cid = value;
						case "Avg": avg = value;
						case "Professor": prof = value;
						case "Title": title = value;
						case "Pass": pass = value;
						case "Fail": fail = value;
						case "Audit": audit = value;
						case "id": uuid = value;
						case  "Section": if (value === "overall") {
							year = 1990;
						}
						case "Year": year = value;
					}
				}));
			if (sub !== null && cid !== null && avg !== null && prof !== null && title !== null && pass !== null &&
				fail !== null && audit !== null && uuid !== null && year !== null) {
				this.secList.push(new Section(sub, cid, avg, prof, title, pass, fail, audit, uuid, year));
				counter++;
			}
		});
		this.datasetList.push({id: id,  kind: kind, numRows: counter});
		this.datasetList.forEach((element) => idList.push(element.id));
		return Promise.resolve(idList);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasetList);
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.resolve([]);
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}
}
