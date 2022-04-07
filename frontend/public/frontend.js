document.getElementById("click-me-button").addEventListener("click", handleClickMe);

function handleClickMe() {
	alert("Button Clicked!");
}

function searchResults() {
	let ins_name = document.getElementById("instructor-name").value;
	let instructorSearchObj: any = {
		"WHERE": {
			"IS": {
				"courses_instructor": {}
			}
		},
		"OPTIONS": {
			"COLUMNS": ["courses_instructor"]
		}
	}
	instructorSearchObj["WHERE"]["IS"]["courses_instructor"] = String(ins_name);
	alert(instructorSearchObj);

}

