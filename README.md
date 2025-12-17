# Module 2 Group Assignment

CSCI 5117, Fall 2025, [assignment description](https://canvas.umn.edu/courses/518559/pages/project-2)

## App Info:

* Team Name: 
* App Name: GYST (Get Your Shit Together)
* App Link: <https://gyst-1ba35.web.app/login>

### Students

* Connell Hagen, hage0686
* Mark Spengler, speng026
* Gabby Ruth, ruth0093
* Daigan Berger, ber00133
* Gabe Robison, girma039


## Key Features

**Describe the most challenging features you implemented
(one sentence per bullet, maximum 4 bullets):**

* Notifications were tricky because learning how to get the service workers working, allow toggling off notifications, and sending notifications on different platforms all required new learning.
* The streak calculation was tricky because there are so many cases where we needed to calculate the streak, and sometimes this would be to increment to the streak, or sometimes just to test if it had expired, and this was complicated.
* Getting the GitHub style visualization was tricky because there was a lot of complicated styling with mobile etc. that had to be done, and the graph setup itself wasn't a trivial task either.
* Getting the task creation and editing working was difficult because we went through many iterations where we found that it was not a very good UX and improved it to make it more intuitive for the user.

Which (if any) device integration(s) does your app support?

* mobile compatible (can add to homescreen on iphone and its different that)

Which (if any) progressive web app feature(s) does your app support?

* push notifications



## Mockup images

![Mockups](/mockup/Homepage.png "Home Page")
This is the main page showing the users grid, based on the GitHub contribution grid, and shows the days of the week and month that they completed all of their tasks, or missed any tasks. The user can also see their completed tasks, tasks they need to do for the day, and the ability
to create new tasks.
![Mockups](/mockup/Login.png "Login Page")
This is the login page where the user can login or create a new account.
![Mockups](/mockup/Settings.png "Settings")
On this page, the user is able to modify their Language, allow notifications, username, or delete their acccount.
![Mockups](/mockup/Sidebar.png "Sidebar")
This is an example of the expanded sidebar which contains the Tasks, Stats, Settings, and Logout.
![Mockups](/mockup/Stats.png "Stats")
Contains basic information about the user and their stats including xp, streak, and level / progress towards the next level.
![Mockups](/mockup/Task-Details.png "Task Details")
This screen pops-up after the user clicks on a task from the homepage, and contains a similar chart, but only for that task, the ability to change it from daily to weekly, and delete the task. The user can also scroll left and right to see their other task details.



## Testing Notes

**Is there anything special we need to know in order to effectively test your app? (optional):**

* Once enabled, expect a push notification to send at 11am daily.


## Screenshots of Site

<img width="1505" height="744" alt="Screenshot 2025-12-17 at 5 09 46 PM" src="https://github.com/user-attachments/assets/346bef87-8851-4c75-8413-02bbd95f2896" />
Splash page.

 <img width="1501" height="737" alt="Screenshot 2025-12-17 at 5 14 33 PM" src="https://github.com/user-attachments/assets/a3f66b70-abb0-4fae-aaab-2e298c1eb2ed" />
 Home page where user can view their tasks, add a new task, and see their streak. 

<img width="1492" height="741" alt="Screenshot 2025-12-17 at 5 15 20 PM" src="https://github.com/user-attachments/assets/fc0a2102-2a7b-4b1c-b575-beebd3571a91" />
Modal where user can edit a task.

<img width="1505" height="751" alt="Screenshot 2025-12-17 at 5 15 50 PM" src="https://github.com/user-attachments/assets/65efc438-949d-4d0b-a210-11c60365f14f" />
Stats page where user can view their tasks contribution graph, their level, streak, tasks, and share their progress with family & friends.

<img width="1497" height="751" alt="Screenshot 2025-12-17 at 5 16 59 PM" src="https://github.com/user-attachments/assets/804e4005-73a2-4bbc-9668-91054f8cbc23" />
Settings page where a user can manage their notification preferences or delete their account.

<img width="1495" height="745" alt="Screenshot 2025-12-17 at 5 17 31 PM" src="https://github.com/user-attachments/assets/182697af-98bf-49ee-85ca-6d73f8ef1254" />
Sidebar component.


## External Dependencies

**Document integrations with 3rd Party code or services here.
Please do not document required libraries (e.g., VUE, Firebase, vuefire).**

* HTML2canvas: to render an image export for sharing with friends
* SASS: improved CSS
* Vue3 Emoji Picker: choose icons for tasks.
