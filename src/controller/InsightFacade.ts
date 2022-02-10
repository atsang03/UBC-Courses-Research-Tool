import JSZip, {loadAsync} from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult} from "./IInsightFacade";
import Section from "./Section";


export default class InsightFacade implements IInsightFacade {
	private datasetList: any[] = [];
	private secList: any[] = [];

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let idList: string[] = [];
		let promises: Array<Promise<any>> = [];
		let zip = new JSZip();
		let counter: number = 0;
		const aPromise = zip.loadAsync(content, {base64: true}).then((zipfile) => {
			zipfile.folder("courses")?.forEach((async (relativePath, file) => {
				// For each Zip object
				let jFile: any;
				promises.push(file.async("string").then((filecontent) => {
					jFile = JSON.parse(filecontent);
					for (const element of  jFile.result) {
						if (element.Section !== null) {
							counter++;
							this.secList.push(new Section(element.Subject, element.Course, element.Avg,
								element.Professor, element.Title, element.Pass, element.Fail, element.Audit,
								element.id, element.Year));
						}
					}
				}));
			}));
		});
		await aPromise;
		await Promise.all(promises);
		this.datasetList.push({id: id, kind: kind, numRows: counter});
		this.datasetList.forEach((element) => idList.push(element.id));
		this.secList.forEach((element) => JSON.stringify(element));
		return Promise.resolve(idList);
	}


	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasetList);
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.resolve([]);
	}

	public removeDataset(id: string): Promise<string> {
		this.datasetList.forEach((element) => {
			if (element.id === id) {
				element.remove();
			}
		}
		);
		return Promise.resolve(id);
	}
}
