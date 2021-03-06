import {
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect} from "chai";

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;
	const persistDir = "./data/data";

	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
		rooms: "./test/resources/archives/rooms.zip"
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		// This is a unit test. You should create more like this!
		it("Should add a valid dataset", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});

		it("should add a room type and multiple datasets", function () {
			const id: string = "rooms";
			const content: string = datasetContents.get("rooms") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			}).then(() => {
				return insightFacade.addDataset("courses",content,InsightDatasetKind.Rooms);
			}).then(() => {
				return insightFacade.addDataset("testingextra",content,InsightDatasetKind.Rooms);
			}).then((res) => {
				expect(res).to.deep.equal(["rooms","courses","testingextra"]);
			});
		});

		it("should return list of datasets", function() {
			const id: string = "rooms";
			const content: string = datasetContents.get("rooms") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then(() => {
				insightFacade.listDatasets().then((res) => {
					expect(res).to.deep.equal([{id: "rooms",kind:"rooms",numRows:364}]);
				});
			});
		});

		it("Should remove a valid dataset", function () {
			const id: string = "courses";
			// console.log(insightFacade.listDatasets());
			// console.log(fs.readdirSync("data") === []);
			return insightFacade.removeDataset(id).then(() => {
				return insightFacade.removeDataset("rooms");
			}).then(() => {
				expect(fs.readdirSync("data")).to.deep.equal(["testingextra"]);
			}).then(() => {
				return insightFacade.removeDataset("testingextra");
			}).then(() => {
				expect(fs.readdirSync("data")).to.deep.equal([]);
			});
		});

		it( "should be able to add after deleting", function() {
			const id1: string = "courses";
			const content: string = datasetContents.get("courses") ?? "";
			const expected: string[] = [id1];
			return insightFacade.addDataset(id1, content, InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.removeDataset(id1);
				}).then(() => {
					return insightFacade.addDataset(id1,content,InsightDatasetKind.Courses);
				}).then((res) => {
					expect(res).to.deep.equal(expected);
				});
		});

	});

	function assertResult(actual: any, expected: any): void {
		expect(actual).to.have.deep.members(expected);
		expect(actual).to.have.length(expected.length);
	}

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
				insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms)
			];
			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => (insightFacade.performQuery(input)),
			"./test/resources/queries",
			{
				assertOnResult: assertResult,
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(actual, expected) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else if (expected === "InsightError") {
						expect(actual).to.be.instanceof(InsightError);
					} else {
						expect(actual).to.be.instanceof(NotFoundError);
					}
				},
			}
		);
	});
});
