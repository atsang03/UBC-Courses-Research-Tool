import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError
} from "./IInsightFacade";
import JSZip, {loadAsync} from "jszip";
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
		let JsonObj = JSON.parse(JSON.stringify(query));
		let result: InsightResult[] = [];
		let DataId: string;
		if (this.checkValidQuery(JsonObj)) {
			return Promise.reject(new InsightError("Invalid Query"));
		}
		// need section to find what dataId is (from OPTIONS->COLUMNS array  since it can never be empty!)
		// since OPTIONS->COLUMNS array must always contain AT LEAST 1 element can always access first element
		DataId = JSON.parse(JSON.stringify(JsonObj["OPTIONS"]["COLUMNS"]))[0].split("_")[0];
		// console.log(typeof DataId);

		// check idstring of COLUMNS are all the same
		for (let value of Object.values(JsonObj["OPTIONS"]["COLUMNS"])) {
			let ParsedValue: string = JSON.parse(JSON.stringify(value));
			if(DataId !== ParsedValue.split("_")[0]) {
				// console.log(DataId + " " + ParsedValue.split("_")[0]);
				return Promise.reject(new InsightError("referenced multiple datasets in COLUMNS"));
			}
		}

		// check idstring of ORDER is the same as DataId
		if (Object.keys(JsonObj["OPTIONS"]).includes("ORDER")) {
			let value: string = JsonObj["OPTIONS"]["ORDER"];
			if (DataId !== value.split("_")[0]) {
				return Promise.reject(new InsightError("referenced multiple datasets in ORDER"));
			}
		}

		// need section to make sure all dataId in WHERE are the same as DataId

		// if WHERE does not contain any specification then push objects into result
		if(Object.keys(JsonObj["WHERE"]).length === 0) {
			result.push();
		}

		// THIS IS FOR TESTING AND LEARNING PURPOSES WILL DELETE LATER
		{
			Object.values(JsonObj).forEach(function recursion(key) {
				let value = JSON.stringify(key);
				value = JSON.parse(value);
			// console.log(typeof value);
				// console.log(value);
				if (typeof value === "object") {
				// console.log("It is an object");
				// console.log(Object.keys(value));
					Object.values(value).forEach(function(values){
						let val = JSON.stringify(values);
						val = JSON.parse(val);
						recursion(val);
					});
				} else {
					// console.log(value);
				}
			});
		}


		// if resulting query exceeds 5000 then fails with ResultTooLargeError
		if (result.length > 5000) {
			return Promise.reject(new ResultTooLargeError());
		} else {
			return Promise.resolve(result);
		}
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

	private checkValidQuery(JsonObj: any): boolean {
		// must contain WHERE and OPTION and only have length of 2 else it will reject with InsightError
		if (!(Object.keys(JsonObj).includes("WHERE"))
			|| !(Object.keys(JsonObj).includes("OPTIONS"))
			|| !(Object.keys(JsonObj).length === 2)
		) {
			return true;
			// return Promise.reject(new InsightError("Does not contain either WHERE/OPTIONS or has too many keys"));
		}

		// must contain COLUMNS inside OPTIONS and has <= 2 keys else it throws an InsightError
		if(!Object.keys(JsonObj["OPTIONS"]).includes("COLUMNS") || !(Object.keys(JsonObj["OPTIONS"]).length <= 2)) {
			return true;
			// return Promise.reject(new InsightError("Does not contain columns"));
		}

		// OPTIONS->COLUMNS array  must not be empty or else throw InsightError
		if (Object.values(JsonObj["OPTIONS"]["COLUMNS"]).length === 0) {
			return true;
			// Promise.reject(new InsightError("COLUMNS array can not be empty"));
		}

		return false;
	}
}
