Please edit this template and commit to the master branch for your user stories submission.   
Make sure to follow the *Role, Goal, Benefit* framework for the user stories and the *Given/When/Then* framework for the Definitions of Done! You can also refer to the examples DoDs in [C3 spec](https://sites.google.com/view/ubc-cpsc310-21w2-intro-to-se/project/checkpoint-3).

## User Story 1
As a Student, I want to query for courses with a certain instructor, so that I can find courses to attend that are taught by a certain instructor.


#### Definitions of Done(s)
Scenario 1 : Valid Query.

Given: User is on the webpage. 
When: the user inputs a valid query for courses taught by a certain instructor 
Then: a list of courses names taught by the instructor will appear. 

Scenario. 2: Invalid Query.

Given: User is on the webpage
When: user inputs an invalid query. 
Then: an error message popping up will appear.

## User Story 2
As a student, I want to see courses in a certain department sorted by the course average, to help me evaluate the difficulty of courses before taking them.


#### Definitions of Done(s)
Scenario 1: Valid department input
 
Given: User is on the webpage
When: The user enters a department name
Then: A list of courses in the department, sorted by average is given.

Scenario 2: Invalid department input

Given: User is on the webpage 
When: The user enters an invalid/nonexistent department name
Then: A message saying “No courses found” will appear.


## Others
You may provide any additional user stories + DoDs in this section for general TA feedback.  
Note: These will not be graded.
