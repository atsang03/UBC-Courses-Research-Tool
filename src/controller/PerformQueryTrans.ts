import {InsightError, InsightResult} from "./IInsightFacade";
import QueryValidatorTrans from "./QueryValidatorTrans";

export default class PerformQueryTrans {
	private query: unknown;
	constructor(input: unknown) {
		this.query = input;
	}

	public performQuery(): Promise<InsightResult[]> {
		let jsonObj = JSON.parse(JSON.stringify(this.query));
		let result: InsightResult[] = [];
		let wantedFields: string[] = [];
		let rawData: string;
		let queryValidatorTrans: QueryValidatorTrans = new QueryValidatorTrans();
		if (queryValidatorTrans.validation(jsonObj,wantedFields)) {
			return Promise.reject(new InsightError());
		}
		return Promise.resolve(result);
	}
}
