import JSZip, {loadAsync} from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError,
	InsightResult, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import Section from "./Section";
import * as fs from "fs";
import Query from "./Query";
export default class InsightFacade implements IInsightFacade {
	private datasetList: any[] = [];
	private secList: any[] = [];
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.includes("_")) {
			throw new InsightError("invalid id");
		}
		let idList: string[] = [];
		let promises: Array<Promise<any>> = [];
		let zip = new JSZip();
		let counter: number = 0;
		const aPromise = await zip.loadAsync(content, {base64: true});
		aPromise.folder("courses")?.forEach((async (relativePath, file) => {
			promises.push(file.async("string").then((filecontent) => {
				let jFile: any = JSON.parse(filecontent);
				for (const element of  jFile.result) {
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
		fs.writeFileSync(`data/${id}` ,JSON.stringify(this.secList));
		return Promise.resolve(idList);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasetList);
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		let input: Query = new Query(query);
		return input.performQuery();
	}

	public removeDataset(id: string): Promise<string> {
		if (id.includes("_")) {
			throw new InsightError("invalid id");
		} else if (this.datasetList.every((element) => {
			return !(element.id === id);
		})) {
			throw new NotFoundError("No dataset with this id found");
		}
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
		fs.unlinkSync(`data/${id}`);
		return Promise.resolve(id);
	}
}
