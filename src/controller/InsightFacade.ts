import JSZip, {loadAsync} from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult} from "./IInsightFacade";
import Section from "../../../project_team659/src/controller/Section";


export default class InsightFacade implements IInsightFacade {
	private datasetList: any[] = [];
	private secList: any[] = [];

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
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
		let promises: Array<Promise<any>> = [];
		let zip = new JSZip();
		const aPromise = zip.loadAsync(content, {base64: true}).then((zipfile) => {
			zipfile.folder("courses")?.forEach((async (relativePath, file) => {
				// For each Zip object
				let jFile: any;
				promises.push(file.async("string").then((filecontent) => {
					jFile = JSON.parse(filecontent);
					for (const element of  jFile.result) {
						sub = element.Subject;
						cid = element.Course;
						avg = element.Avg;
						prof = element.Professor;
						title = element.Title;
						pass = element.Pass;
						fail = element.Fail;
						audit = element.Audit;
						uuid = element.id;
						console.log(cid);
						if (element.Year === "overall") {
							year = 1990;
						}
						year = element.Year;
					}
					this.secList.push(new Section(sub, cid, avg, prof, title, pass, fail, audit, uuid, year));
					console.log(this.secList);
				}));
			}));
		}).then(() => {
			Promise.all(promises);
			console.log(counter);
			this.datasetList.push({id: id, kind: kind, numRows: counter});
			this.datasetList.forEach((element) => idList.push(element.id));
		});
		await aPromise;
		await Promise.all(promises);
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
