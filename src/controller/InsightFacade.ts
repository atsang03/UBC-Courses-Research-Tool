import JSZip, {loadAsync} from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult} from "./IInsightFacade";
import Section from "./Section";


export default class InsightFacade implements IInsightFacade {

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let sub;
		let avg;
		let prof;
		let title;
		let pass;
		let fail;
		let audit;
		let cid;
		let uuid;
		let year;
		let zip = new JSZip();
		zip.loadAsync(content, {base64: true}); // Store data as JSzip
		zip.forEach(function(relativePath, file) { // For each Zip object
			let cont = file.async("string").then // Read it, store it as a string
				// eslint-disable-next-line no-unexpected-multiline
			((filecontent) => JSON.parse(filecontent, (key, value) => {
				switch (key) {
					case "Subject:":
						sub = value;
					case "Course":
						cid = value;
					case "Avg":
						avg = value;
					case "Professor":
						prof = value;
					case "Title":
						title =  value;
					case "Pass":
						pass = value;
					case "Fail":
						fail = value;
					case "Audit":
						audit = value;
					case "id":
						uuid = value;
					case  "Section":
						if (value === "overall") {
							year = 1990;
						}
					case "Year":
						year = value;
				}
			}));// store it as our data type

		});
		return Promise.resolve([]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.resolve([]);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}
}
