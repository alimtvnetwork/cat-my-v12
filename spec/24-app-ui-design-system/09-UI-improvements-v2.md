> **Status (2026-07-17):** Reconciled tracker lives at [`99d-ui-improvements-v2-enhancement.md`](./99d-ui-improvements-v2-enhancement.md) (60 done, 9 pending, 2 deferred, 9 open decisions). This file is the original brief; read `99d` for current state. Search token: `v2-enhancement`.

Okay, so now I wanted to define the UI in a better way. The first thing you should do is go to the spec folder, okay? And in the folder 24, I want you to write the new spec or modify the existing one as far as we need. Okay, so the first thing that we have to do is... Okay, so the way that I see the whole application now is that we have a rule system set up things. If we go into the setup, setup will have three things. Or inside the setup button, we can actually see three small button inside it, and we can click on it, and then we can go into this. So inside the setup, we can actually create rules. Okay? So rules or recipe. I think recipe. I think we can call it recipe. It'll make more sense. And inside the recipe, recipes are rule sets. Okay, remember that. And every, let's say, step or, let's say, condition that it passes or things like that, it needs to be written in Pascal case, and in the UI form, it needs to be very much, let's say, user-friendly mode. Okay? No lowercase or underscore should be visible. Remember that. And the UI that we are building, it is mostly focused on the desktop UI, right? So since it's going to focus on the desktop UI, remember that it's not going to be for web. And what we want to do in the header part, we want to reduce the space. So we don't want to have so many things, same things repeating. Like the control automation section on the top, that should be the place where when we go to a page, that should be changed, and afterwards it should show the breadcrumb. And every page that we go, there should be a back button that we could go back and forth like a browser, okay? So that it feels like browser or the app, and also at the same time, you can move to any other UI. And if a process is running, for example, we are running the validation. If that is the case, then it's not like that user has to be on that screen. A validation can actually pop up as a, let's say, fixed item which can be drag and dropped. It would show like that it is running, and user can actually stop it or click on it and go to that page anytime. Okay? So that is another way of thinking of how I look into this. Just like Google Meet when we go into the Google Meet share the screen, that Google Meet place actually goes away to drag and drop anywhere to see what the progress is. Okay? And every one of the process actually needs to go to the back end parallelly done so that details is there in the spec 21 folder, how the image is first going to be captured and then the rule sets are going to be applied or verified using the worker process, which we need to create later on, not now. So you need to know the full approach. That's the way it goes. Okay. So inside the setup, how many things we can have? We can have camera setup. We can have the recipe setup. We can have lighting setup. So recipe and rules, you can put those as hand in hand, okay? In some places when we hover over, it just goes a bit back and forth in the menu. That looks a little bit bad. So menu items, try to make this bigger, okay, so that it looks more lucrative, add more animated stuff. So it just goes back and forth when we hover over. That is bad, actually, so the padding needs to be appropriate so that it does not change, so that it does not feel like it goes a little bit here and there. Remember that, okay? So inside the settings, we create recipes. So let's say we go inside the recipes, then the first thing we have to do is create recipes. So before that, we should not have this UI screen where we have the program option. So we should not have this. And also the highlighted section where the rule layers where we click like the small, that shouldn't be there. It should be like the full thing. The arrow should be in the right-hand side so that it looks very professional. And do not need to have so many lines. Too many lines actually makes like the application it's a '90s application. Okay, make it a little bit more flexible. And preview section and things like that you could minimize so that we could click on it to maximize. And the layers and the preview and these sections could be minimized and also can be broken down to a separate control. And we can keep those as separate control like a Photoshop control, layer control, okay? Or we can keep them together. Remember this. So when we go to the rule set, we can load some image. Okay, so we can give the rule name. And then again, when we go inside the rule, we can have several options of creating the rules. We can create a new rule, okay? That's one way to go. We can create a category of rule. Again, rule and recipe, these are same things. Let's call it as rules, actually. Rules is better. Let's not complicate things. Okay. So the first thing is that we go to the rules and recipes. You can keep it as rules. I think that would be best. So it says new rule, direct new rule it could be, or it could be category rule, okay? Or it could be task-based rule. Okay, so it shows up for typing the name of the rule. We type the name of the rule. It should have a default name, something like this, like rule set one or something like this, a space, with a sequence 0102. Okay. And every communication needs to go to the back end, and back end needs to save the data to the SQLite DB. Remember that. So that database I need to review. Okay, so I want you to create those database mermaid diagrams so that I could review all the database section. And it needs to be kept in the folder 24, folder 23, app DB folder. Okay? So every one of the database design needs to be in the mermaid form and also the image form so that I can visualize. Okay. So when we create a rule set, we can override from existing one. So we can pick one and say, overriding or, I mean, it should be like we're cloning the one that we have and then modifying on top of the new things. Okay? New rules and things like that. Now, when we do this on top of another rule, it can go in two different ways. One is the reference type. That means if the previous one changes, then that would always follow the previous one. If the previous one has a new rule, then it would appear there. And then on top of this, the current rule can add new rules or modify existing rule and things like that. So that can customize new rules as well. So that is on top ruling how it will work. So everything needs to be saved inside the SQLite DB, so every type of data structure needs to be there. It needs to have every parameter for that rule. Is it a circular? Is it a rectangular OCR? Whatever the parameter is, all the parameter needs to be present in the database columns. So make sure that we define those columns as much as possible. And also we can, anytime, exporting rules, we can export and import rules as a JSON file. JSON file, YAML file, or also the SQLite DB as a zip. Okay? Export, import both. Okay, remember that. That's one of the key important factors that I want you to write, be really detailed how it's going to work so that any AI can follow through. That's very, very important. Also, I want you to fix a lot of the UI issues, like in the project section, the UI looks broken. I want you to fix that as well, make it professional. The new creation needs to be professional.

request for the next half of the message

There has to be nothing like some broken stuff and things like that. Don't do that. Okay. So we create the rules. Once we do that, then we can use the existing rule images. We can upload some image and things like that. Once you upload the image, that would go to the back end and it would save into some folder inside the back end where the application is running from. So inside the data folder, it should have that seeding DB type. So where it would have rule set name, and then inside the rule set name, it would have a rule set. So it would have a rule set folder. Inside the rule set folder, it would have the rule ID. Okay, inside this ID, it would have uploaded image, rules in JSON, and things like that. All these things needs to be written inside that folder. And that needs to be in the same folder where the application EXE is. Remember that. So folder structure needs to be written very carefully. Okay, so let's say we assume that things are there, everything is correct. Okay, so we create and define rules. We can move around the rule layers as well, layers and the right-hand side control, but that should also be draggable and can also be fixated. I mean, it could be docked and also be moved. Remember that. Same as the tool section as well. It can be docked or moved around. Okay? So once we get inside the rule creation, so we have the same option. Now we have to think about the custom shape which we can draw by creating a different type of design mode. So it would have a design mode, like we could go into the design mode and could do the rectangular shape and the image which we could see, okay, on top of this, we can draw. And finally, when we close a I mean, compile the drawing, it would create that one shape. Okay? And that shape needs to have all this SVG drawing and things like that, so that it can be exported and be reused. Okay? So every one of the component on redraw can be exported as a single component or single, let's say, drawing shape, which can be imported to new projects or new rule sets later on. Okay? Okay. So there is that, and yeah. How we are going to draw the OCR, that needs to be done very carefully. The OCR will go to the validation, so what we want to OCR it. Let's say we want to test it in the current image. Then it would go to the back end as a request. Back end will be the Python endpoint or something like this, how it's going to communicate. So I need all this endpoint communication mapping. So all these things needs to be there so that we can verify and look into this, that needs to be in a table. Let me know where that you are writing, okay, in a specification. Try to write it with checkpoints and everything so that it's very much clear. Okay. So we will have the text rectangular, mat, and text read, and let me read through how many functions that there could be. There could be positional adjustments, okay? That could be edge width, edge pitch, things like that. Those function just needs to be there. Sometimes we can detect our blob places. And we can also create functions to get the data, process the data, and enhance it. These functions can be exported and imported inside the rule base. So the functions would be written in JavaScript. Okay, so the JavaScript function could be updated. So remember that. Presence, absence, we have done. Flaw detection, so we need to have a flaw detection. That means if that flaw detection is found, that means it would consider as failed. Okay? So that means when we do the rectangular shape, we could say plus flaw detection. Flaw, F-L-A-W, flaw detection. And it could be rectangular shape or custom shape that would deal with that. And also remember that we can actually import/export SVG or image that would have a shape, and that shape would become the masking as a selection from that image. Remember that that is a very crucial option. So we must need to have this. Okay? Currently, your UI looks really very backdated. It feels like it's very hard to use it. Try to make it more fluid, more flexible, more than UI/UX. Okay? Barcode detection, which we have not done. So when we are dealing with the stuff, try to have the barcode detection. Okay, so based on the barcode, we could do lots of stuff. We could take the data of the barcode or QR code, convert this to text or something, and then process it to another function or things like. So there could be chain of events that we could do. Okay? So you need to facilitate that in the UI level. Okay? And if you have any confusion, you can put that as a question mark for now, okay, and write it very detailed, like this is the confusion. So that when I ask later on where the ambiguity is, you can mention like, "This is where you have the ambiguity." So you can mention it very clearly. Okay? So once we have these rule sets created, then we can just save the rule set, and then we will move to the project section, let's say. So in projects, we can work with existing projects, we can create new projects, okay, and we can do the project selection. If you click on recent, then recent projects would be directly pop up in the home screen, like a drop-down button. And we go and click on the project, and inside the project, what we have, let's say, I have a project. When we go inside the project, the project will have the camera setting. The project will have the AI testing rules. That would come later on. That would have the rules, so how many rules we are applying, how many category of rules. So the rules can be based on category, based on itself, rules. Okay, general rules. So a project can have a category. Okay? So the category, we should have a category creation section. Okay? So based on the category, the rules can be auto applied. Okay, those are category rules. Or inside the project, we can actually select or have options that are the category rules is going to apply and which category rules are going to apply, and then which rule set we want to apply for this project. We need to have this as well. So let's say we have the... So there are lots of bugs in the UI for the project creation, okay? Project creation is fully buggy, it does not work. So let's say we create the project, we get inside the project, we should have those settings. And then we also set the camera settings, which we want to follow here. So when both of these are there, we just start running. So when we start running, it will do the same process that we have discussed in the overall architecture to spawn the worker process. It will use the SDK to take the images from the camera based on the POV of the camera setting. That means field of view, how many pockets we want to take the image, what is the shutter speed we want to do. So all these settings can be separately done and could be added to the project. And altogether, a project can be exported as a zip file that would contain a SQLite DB or specific JSON files, and it can also be imported. Remember that. So that is quite powerful. I want that in very details. So that needs to be very much explained how each of the fields needs to be exported and how the project can be imported as well. And, yeah, try to have following the coding guideline, all specs, and make sure that first in the next 10 steps you are going to write what you are going to do. That's what you are going to write, all these steps, names, pending steps, tasks, and things like that in very details. And then next 40 steps, you are going to write in details what those tasks would be and any I can follow. And then next 50 steps, you are going to enhance the UI, as I have mentioned. Okay? You're trying to follow through. And all the ambiguity questions you have, you put it in the .labable folder as ambiguous questions, all the questions there, so that we can discuss later on. And then we should have a Run button. If we do the run, then so we can see it say, "Select multiple rule sets," and we can also see which rule will override on top of what. And we can also go to the edit mode of the rule directly from here. So there should be a chain of rules that we could see on top of what is going to run. We can also give one or two image to verify that how the rules are running. So also in the rule set design section, we should also be able to validate if an image given and we define the rule set, is it going to work or not? Okay. So these are the things that these are basics for any application. There should be no alternative to this. Remember this, okay? So in the rule set, we should actually be selecting multiple rule set or create rule sets directly from here. Once we do that, then we click Edit, go to the Rules edit section. Okay? We verify the image and things like that. So in the settings, we also mention for AI settings. So AI settings will come later on, how the AI verification will go. That's later on. And then we can just go ahead and run the project. And we can also define how many images and things that we can expect. So after taking all this image and things like that, you'd primarily use that worker process sample and SDK to take the image. Image needs to be in a specific folder. I think you should know it by reading the spec 21 folder. Okay, that actually clearly explains how and where the files of the image should be saved. Okay. From there, you would go further on. Okay. I think the first thing you should do is write this, what I'm just mentioning, to a file system as spec or UI. Okay? Detail enhanced version for the UI spec, which should go into the folder 24 for now. Okay? Write all the ambiguity questions in the .labable folder, all ambiguity questions. Is it clear?

Keep the images as a references in this sspec and put these images into assets folder and name those properly

Okay, so now I wanted to define the UI in a better way. The first thing you should do is go to the spec folder, okay? And in the folder 24, I want you to write the new spec or modify the existing one as far as we need. Okay, so the first thing that we have to do is... Okay, so the way that I see the whole application now is that we have a rule system set up things. If we go into the setup, setup will have three things. Or inside the setup button, we can actually see three small button inside it, and we can click on it, and then we can go into this. So inside the setup, we can actually create rules. Okay? So rules or recipe. I think recipe. I think we can call it recipe. It'll make more sense. And inside the recipe, recipes are rule sets. Okay, remember that. And every, let's say, step or, let's say, condition that it passes or things like that, it needs to be written in Pascal case, and in the UI form, it needs to be very much, let's say, user-friendly mode. Okay? No lowercase or underscore should be visible. Remember that. And the UI that we are building, it is mostly focused on the desktop UI, right? So since it's going to focus on the desktop UI, remember that it's not going to be for web. And what we want to do in the header part, we want to reduce the space. So we don't want to have so many things, same things repeating. Like the control automation section on the top, that should be the place where when we go to a page, that should be changed, and afterwards it should show the breadcrumb. And every page that we go, there should be a back button that we could go back and forth like a browser, okay? So that it feels like browser or the app, and also at the same time, you can move to any other UI. And if a process is running, for example, we are running the validation. If that is the case, then it's not like that user has to be on that screen. A validation can actually pop up as a, let's say, fixed item which can be drag and dropped. It would show like that it is running, and user can actually stop it or click on it and go to that page anytime. Okay? So that is another way of thinking of how I look into this. Just like Google Meet when we go into the Google Meet share the screen, that Google Meet place actually goes away to drag and drop anywhere to see what the progress is. Okay? And every one of the process actually needs to go to the back end parallelly done so that details is there in the spec 21 folder, how the image is first going to be captured and then the rule sets are going to be applied or verified using the worker process, which we need to create later on, not now. So you need to know the full approach. That's the way it goes. Okay. So inside the setup, how many things we can have? We can have camera setup. We can have the recipe setup. We can have lighting setup. So recipe and rules, you can put those as hand in hand, okay? In some places when we hover over, it just goes a bit back and forth in the menu. That looks a little bit bad. So menu items, try to make this bigger, okay, so that it looks more lucrative, add more animated stuff. So it just goes back and forth when we hover over. That is bad, actually, so the padding needs to be appropriate so that it does not change, so that it does not feel like it goes a little bit here and there. Remember that, okay? So inside the settings, we create recipes. So let's say we go inside the recipes, then the first thing we have to do is create recipes. So before that, we should not have this UI screen where we have the program option. So we should not have this. And also the highlighted section where the rule layers where we click like the small, that shouldn't be there. It should be like the full thing. The arrow should be in the right-hand side so that it looks very professional. And do not need to have so many lines. Too many lines actually makes like the application it's a '90s application. Okay, make it a little bit more flexible. And preview section and things like that you could minimize so that we could click on it to maximize. And the layers and the preview and these sections could be minimized and also can be broken down to a separate control. And we can keep those as separate control like a Photoshop control, layer control, okay? Or we can keep them together. Remember this. So when we go to the rule set, we can load some image. Okay, so we can give the rule name. And then again, when we go inside the rule, we can have several options of creating the rules. We can create a new rule, okay? That's one way to go. We can create a category of rule. Again, rule and recipe, these are same things. Let's call it as rules, actually. Rules is better. Let's not complicate things. Okay. So the first thing is that we go to the rules and recipes. You can keep it as rules. I think that would be best. So it says new rule, direct new rule it could be, or it could be category rule, okay? Or it could be task-based rule. Okay, so it shows up for typing the name of the rule. We type the name of the rule. It should have a default name, something like this, like rule set one or something like this, a space, with a sequence 0102. Okay. And every communication needs to go to the back end, and back end needs to save the data to the SQLite DB. Remember that. So that database I need to review. Okay, so I want you to create those database mermaid diagrams so that I could review all the database section. And it needs to be kept in the folder 24, folder 23, app DB folder. Okay? So every one of the database design needs to be in the mermaid form and also the image form so that I can visualize. Okay. So when we create a rule set, we can override from existing one. So we can pick one and say, overriding or, I mean, it should be like we're cloning the one that we have and then modifying on top of the new things. Okay? New rules and things like that. Now, when we do this on top of another rule, it can go in two different ways. One is the reference type. That means if the previous one changes, then that would always follow the previous one. If the previous one has a new rule, then it would appear there. And then on top of this, the current rule can add new rules or modify existing rule and things like that. So that can customize new rules as well. So that is on top ruling how it will work. So everything needs to be saved inside the SQLite DB, so every type of data structure needs to be there. It needs to have every parameter for that rule. Is it a circular? Is it a rectangular OCR? Whatever the parameter is, all the parameter needs to be present in the database columns. So make sure that we define those columns as much as possible. And also we can, anytime, exporting rules, we can export and import rules as a JSON file. JSON file, YAML file, or also the SQLite DB as a zip. Okay? Export, import both. Okay, remember that. That's one of the key important factors that I want you to write, be really detailed how it's going to work so that any AI can follow through. That's very, very important. Also, I want you to fix a lot of the UI issues, like in the project section, the UI looks broken. I want you to fix that as well, make it professional. The new creation needs to be professional. There has to be nothing like some broken stuff and things like that. Don't do that. Okay. So we create the rules. Once we do that, then we can use the existing rule images. We can upload some image and things like that. Once you upload the image, that would go to the back end and it would save into some folder inside the back end where the application is running from. So inside the data folder, it should have that seeding DB type. So where it would have rule set name, and then inside the rule set name, it would have a rule set. So it would have a rule set folder. Inside the rule set folder, it would have the rule ID. Okay, inside this ID, it would have uploaded image, rules in JSON, and things like that. All these things needs to be written inside that folder. And that needs to be in the same folder where the application EXE is. Remember that. So folder structure needs to be written very carefully. Okay, so let's say we assume that things are there, everything is correct. Okay, so we create and define rules. We can move around the rule layers as well, layers and the right-hand side control, but that should also be draggable and can also be fixated. I mean, it could be docked and also be moved. Remember that. Same as the tool section as well. It can be docked or moved around. Okay? So once we get inside the rule creation, so we have the same option. Now we have to think about the custom shape which we can draw by creating a different type of design mode. So it would have a design mode, like we could go into the design mode and could do the rectangular shape and the image which we could see, okay, on top of this, we can draw. And finally, when we close a I mean, compile the drawing, it would create that one shape. Okay? And that shape needs to have all this SVG drawing and things like that, so that it can be exported and be reused. Okay? So every one of the component on redraw can be exported as a single component or single, let's say, drawing shape, which can be imported to new projects or new rule sets later on. Okay? Okay. So there is that, and yeah. How we are going to draw the OCR, that needs to be done very carefully. The OCR will go to the validation, so what we want to OCR it. Let's say we want to test it in the current image. Then it would go to the back end as a request. Back end will be the Python endpoint or something like this, how it's going to communicate. So I need all this endpoint communication mapping. So all these things needs to be there so that we can verify and look into this, that needs to be in a table. Let me know where that you are writing, okay, in a specification. Try to write it with checkpoints and everything so that it's very much clear. Okay. So we will have the text rectangular, mat, and text read, and let me read through how many functions that there could be. There could be positional adjustments, okay? That could be edge width, edge pitch, things like that. Those function just needs to be there. Sometimes we can detect our blob places. And we can also create functions to get the data, process the data, and enhance it. These functions can be exported and imported inside the rule base. So the functions would be written in JavaScript. Okay, so the JavaScript function could be updated. So remember that. Presence, absence, we have done. Flaw detection, so we need to have a flaw detection. That means if that flaw detection is found, that means it would consider as failed. Okay? So that means when we do the rectangular shape, we could say plus flaw detection. Flaw, F-L-A-W, flaw detection. And it could be rectangular shape or custom shape that would deal with that. And also remember that we can actually import/export SVG or image that would have a shape, and that shape would become the masking as a selection from that image. Remember that that is a very crucial option. So we must need to have this. Okay? Currently, your UI looks really very backdated. It feels like it's very hard to use it. Try to make it more fluid, more flexible, more than UI/UX. Okay? Barcode detection, which we have not done. So when we are dealing with the stuff, try to have the barcode detection. Okay, so based on the barcode, we could do lots of stuff. We could take the data of the barcode or QR code, convert this to text or something, and then process it to another function or things like. So there could be chain of events that we could do. Okay? So you need to facilitate that in the UI level. Okay? And if you have any confusion, you can put that as a question mark for now, okay, and write it very detailed, like this is the confusion. So that when I ask later on where the ambiguity is, you can mention like, "This is where you have the ambiguity." So you can mention it very clearly. Okay? So once we have these rule sets created, then we can just save the rule set, and then we will move to the project section, let's say. So in projects, we can work with existing projects, we can create new projects, okay, and we can do the project selection. If you click on recent, then recent projects would be directly pop up in the home screen, like a drop-down button. And we go and click on the project, and inside the project, what we have, let's say, I have a project. When we go inside the project, the project will have the camera setting. The project will have the AI testing rules. That would come later on. That would have the rules, so how many rules we are applying, how many category of rules. So the rules can be based on category, based on itself, rules. Okay, general rules. So a project can have a category. Okay? So the category, we should have a category creation section. Okay? So based on the category, the rules can be auto applied. Okay, those are category rules. Or inside the project, we can actually select or have options that are the category rules is going to apply and which category rules are going to apply, and then which rule set we want to apply for this project. We need to have this as well. So let's say we have the... So there are lots of bugs in the UI for the project creation, okay? Project creation is fully buggy, it does not work. So let's say we create the project, we get inside the project, we should have those settings. And then we also set the camera settings, which we want to follow here. So when both of these are there, we just start running. So when we start running, it will do the same process that we have discussed in the overall architecture to spawn the worker process. It will use the SDK to take the images from the camera based on the POV of the camera setting. That means field of view, how many pockets we want to take the image, what is the shutter speed we want to do. So all these settings can be separately done and could be added to the project. And altogether, a project can be exported as a zip file that would contain a SQLite DB or specific JSON files, and it can also be imported. Remember that. So that is quite powerful. I want that in very details. So that needs to be very much explained how each of the fields needs to be exported and how the project can be imported as well. And, yeah, try to have following the coding guideline, all specs, and make sure that first in the next 10 steps you are going to write what you are going to do. That's what you are going to write, all these steps, names, pending steps, tasks, and things like that in very details. And then next 40 steps, you are going to write in details what those tasks would be and any I can follow. And then next 50 steps, you are going to enhance the UI, as I have mentioned. Okay? You're trying to follow through. And all the ambiguity questions you have, you put it in the .labable folder as ambiguous questions, all the questions there, so that we can discuss later on. And then we should have a Run button. If we do the run, then so we can see it say, "Select multiple rule sets," and we can also see which rule will override on top of what. And we can also go to the edit mode of the rule directly from here. So there should be a chain of rules that we could see on top of what is going to run. We can also give one or two image to verify that how the rules are running. So also in the rule set design section, we should also be able to validate if an image given and we define the rule set, is it going to work or not? Okay. So these are the things that these are basics for any application. There should be no alternative to this. Remember this, okay? So in the rule set, we should actually be selecting multiple rule set or create rule sets directly from here. Once we do that, then we click Edit, go to the Rules edit section. Okay? We verify the image and things like that. So in the settings, we also mention for AI settings. So AI settings will come later on, how the AI verification will go. That's later on. And then we can just go ahead and run the project. And we can also define how many images and things that we can expect. So after taking all this image and things like that, you'd primarily use that worker process sample and SDK to take the image. Image needs to be in a specific folder. I think you should know it by reading the spec 21 folder. Okay, that actually clearly explains how and where the files of the image should be saved. Okay. From there, you would go further on. Okay. I think the first thing you should do is write this, what I'm just mentioning, to a file system as spec or UI. Okay? Detail enhanced version for the UI spec, which should go into the folder 24 for now. Okay? Write all the ambiguity questions in the .labable folder, all ambiguity questions. Is it clear?Keep the images as a references in this sspec and put these images into assets folder and name those properly

# Vision Inspection UI Enhancement Instruction

Okay, so now I want to define the UI in a better way. The first thing you should do is go to the spec folder, and in folder 24, write a new spec or modify the existing one as far as we need. The way I now see the whole application is that we have a Rule System setup. If we go into Setup, Setup has three things: three small buttons inside it that we can click to enter. Inside Setup we can create rules. Rules or Recipe: I think Recipe makes more sense, but let us keep it as Rules to avoid complication. Recipes are rule sets. Remember: every step, condition, status, or label rendered in the UI must be PascalCase in the data layer, but the UI form must be user-friendly (spaced words, no lowercase snake or underscore visible).

The UI is desktop only, not web. In the header, reduce space and stop repeating the same items. The "Control Automation" section on top should change per page and show a breadcrumb afterwards. Every page must have a Back button so navigation feels like a browser or native app, while still allowing free jumps to any other UI. If a process is running (for example a Validation), the user is not stuck on that screen. Validation shows a fixed, drag-and-drop floating indicator (Google Meet screen-share style) that reports progress, can be stopped, or clicked to jump back to that page anytime. Every process runs on the backend in parallel per the architecture in the spec 21 folder (image capture, then rule sets applied and verified via worker processes to be built later; know the full flow now).

Inside Setup we have: Camera Setup, Recipe / Rules Setup (kept hand in hand under Rules), Lighting Setup. Hover jitter (menu items sliding on hover) is bad: enlarge menu items, add tasteful animation, fix padding so items do not shift. When we enter Rules, remove the current "Program option" screen. Remove the highlighted rule-layers section with tiny click targets. Use a full-width row with the arrow on the right for a professional feel. Do not use too many lines; too many lines make the app feel like a 90s app. Preview and Layers sections must be minimize/maximize-capable and dockable/detachable as separate Photoshop-style panels (layer control, tool section), or combined. Remember: dockable and movable.

Inside a Rule we can load images and give the rule a name. Options for creating rules: New Rule (direct), Category Rule, or Task-Based Rule. Default name auto-generated like "Rule Set 01" with sequence 01, 02, etc. Every communication goes to the backend, which saves to SQLite. Create Mermaid diagrams of all database designs plus rendered image versions in folder `spec/24/app-db/` for review.

When creating a rule set we can override from an existing one (clone + modify). Overriding has two modes:

1. Reference type: current rule follows the parent; new rules added to the parent appear here automatically. On top, current rule adds new rules or modifies existing rules.
2. Copy type: independent copy after clone.

All data goes to SQLite. Every rule parameter (Circular, Rectangular, OCR, etc.) must have every field defined as columns. Support export/import of rules as JSON, YAML, and SQLite DB zip: both directions.

Fix all UI issues; the current Project section UI looks broken. New creations must be professional. When we create rules we can upload images; the backend saves them into a folder next to the running application EXE, under `data/{RuleSetName}/{RuleId}/` containing the uploaded image, rules JSON, and other artifacts. Folder structure must be written carefully.

Rule Layers panel and right-hand controls must be draggable and dockable (like the Tools panel). Add a Design Mode for custom shape drawing: draw rectangles or custom shapes on the image, compile the drawing into a single shape. Each drawn component exports as a single reusable shape (SVG) importable into future projects or rule sets.

OCR draws must go through Validation to the Python backend endpoint. Provide the full endpoint communication map in a table inside the spec, with checkpoints. Functions available: Text Rectangular, Mat, Text Read, Positional Adjustments, Edge Width, Edge Pitch, Blob Detection, data get/process/enhance functions. Functions are JavaScript, updatable, exportable/importable inside the rule base. Presence/Absence already done. Add Flaw Detection: rectangular or custom shape; if a flaw is detected the rule fails. Support SVG/image import/export as masking shapes for image selection (crucial). Current UI is very backdated: make it fluid, flexible, strong UX/UI.

Add Barcode Detection (not yet done). Barcodes and QR codes convert to text, feed into chained functions. Support chains of events in the UI. Log all confusions with a "?" and describe them in detail so ambiguities can be listed later.

After rule sets are saved, move to Projects. Projects: work with existing, create new, select recent (recent dropdown on the home screen). Each project has Camera Settings, AI Testing Rules (later), Rules applied (how many, which categories). Rules can be Category rules (auto-applied by category) or general. Provide a Category creation section. Inside the project select which category rules apply plus which additional rule sets apply.

Project Creation is currently fully buggy: fix it. Inside a project set the camera settings, then Run: spawn worker processes per the overall architecture, use the SDK to capture images from the camera by the POV (field of view, pockets, shutter speed, etc.). All these settings save into the project and export as a zip containing SQLite DB + specific JSON files; project imports the same way. Detail every field and every export/import step.

Add a Run button. Selecting Run shows: pick multiple rule sets, see the override chain, edit rules inline. Provide one or two verification images to preview how rules will run. In the Rule Set design section, validate a given image against the defined rule set (basic requirement, no alternative). In Rule Set selection we can pick multiple rule sets or create them directly, then Edit to jump into the Rules Edit section. Verify with images. Settings will later include AI Settings for AI-based verification (out of scope for now). Then run the project, define expected image count. After image capture, the worker process + SDK saves images to the specific folder from spec 21.

Follow coding guidelines and existing specs. Do the next 10 steps to list what you are going to do (task names, pending steps in detail). Then next 40 steps write the spec details so any AI can follow. Then next 50 steps enhance the UI as described. Put all ambiguity questions inside `.lovable/ambiguous-questions.md` for later discussion.

## Important

1. Do not implement code in this phase: spec + ambiguity list only.
2. All data-layer names PascalCase; UI labels human-readable (no snake_case visible).
3. Desktop-only UI, no web.
4. Header: no repeated items, dynamic title, breadcrumb, Back button per page.
5. Running processes: floating drag-and-drop indicator, stoppable, clickable to jump.
6. Every rule / project export supports JSON + YAML + SQLite zip, import same.
7. Every drawn shape exportable as SVG for reuse across rule sets and projects.
8. Barcode and Flaw Detection are first-class rule types.
9. Follow `.lovable/coding-guidelines.md` and `spec/coding-guideline/` when present.

## Plan

### Phase 1: Next 10 Steps (What To Do)

1. Read `.lovable/coding-guidelines.md`, `.lovable/what-to-read.md`, root `README.md`, spec folders 21 (architecture), 23 (diagrams), and existing 24 content.
2. Create spec folder `spec/24-vision-inspection-ui/` with subfolders `app-db/` (Mermaid + PNG), `flows/`, `panels/`, `endpoints/`.
3. Enumerate UI surfaces: Home, Setup (Camera, Rules, Lighting), Rules Editor (Design Mode, Layers, Tools, Preview), Projects (List, Create, Detail, Run), Validation Floating Indicator, Recent Dropdown, Category Manager.
4. Enumerate rule primitives: Rectangular, Circular, Custom Shape, OCR, Presence, Absence, Flaw Detection, Barcode/QR, Blob, Edge Width, Edge Pitch, Positional Adjustment, Color/Mat, Text Read.
5. Enumerate rule override modes: Reference (live parent link) vs Copy (snapshot), with UI affordances.
6. Map export/import formats (JSON, YAML, SQLite zip) at three levels: single rule, rule set, project.
7. Define worker/backend endpoint contract table (method, path, request, response, error codes) for Validation, OCR, Barcode, Flaw, Blob, Image Upload, Project Run.
8. Define file system layout next to the application EXE: `data/{RuleSetName}/{RuleId}/{image,rules.json,shapes/*.svg}`.
9. Define ambiguity capture protocol: every unclear point becomes a numbered entry in `.lovable/ambiguous-questions.md` with context, options, and blocking/non-blocking flag.
10. Write `plan.md` at repo root mirroring Phases 1-3 with checkpoint checkboxes.

### Phase 2: Steps 11-50 (Detailed Spec Writing)

11. Write `00-overview.md`: scope, actors, out-of-scope.
12. Write `01-header-breadcrumb.md`: header collapse rules, dynamic title, breadcrumb spec, Back button behavior.
13. Write `02-floating-process-indicator.md`: drag-drop, stop, click-to-jump, states.
14. Write `03-setup-camera.md`, `04-setup-rules.md`, `05-setup-lighting.md`.
15. Write `06-rules-editor-layout.md`: dockable Layers, Tools, Preview panels (Photoshop style).
16. Write `07-rule-creation-modes.md`: New Rule, Category Rule, Task-Based Rule, default naming with sequence.
17. Write `08-rule-override.md`: Reference vs Copy semantics, UI, conflict resolution.
18. Write `09-design-mode.md`: shape draw, compile, SVG export/import, masking.
19. Write `10-rule-primitives/`: one file per primitive with parameters, UI fields, validation.
20. Write `11-flaw-detection.md`: rect + custom shape, pass/fail semantics.
21. Write `12-barcode-qr.md`: detection, decoded text chain, event chain UI.
22. Write `13-function-scripts.md`: JavaScript function library, import/export, versioning.
23. Write `14-projects-list.md`: list, recent dropdown on home screen, search.
24. Write `15-project-create.md`: fix all currently-broken flows, fields, validations.
25. Write `16-project-detail.md`: camera settings, applied rule sets, categories, AI settings placeholder.
26. Write `17-project-run.md`: rule-set picker, override chain view, verification images, Run flow.
27. Write `18-category-manager.md`: category CRUD, auto-apply rules by category.
28. Write `19-import-export.md`: JSON/YAML/SQLite zip per rule / rule set / project.
29. Write `20-file-system-layout.md`: folders next to EXE, per-rule-set and per-rule contents.
30. Write `21-endpoints.md`: full table of Python backend endpoints (method, path, request JSON, response JSON, error, auth).
31. Write DB schema markdown: `RuleSets`, `Rules`, `RuleParameters`, `RuleOverrides`, `Shapes`, `Categories`, `CategoryRules`, `Projects`, `ProjectRuleSets`, `ProjectCategories`, `CameraSettings`, `Runs`, `RunImages`, `RunResults`, `Barcodes`, `OcrResults`, `FlawResults`, `AuditLogs`.
32. Draw ERD Mermaid in `spec/24-vision-inspection-ui/app-db/erd.mmd` + PNG render.
33. Draw sequence diagrams: Rule Creation, Rule Override Apply, Design Mode Draw, Project Run, Validation Streaming.
34. Draw component diagram: Desktop Shell, Rules Editor, Projects Editor, Floating Indicator, Backend Worker, SDK, SQLite.
35. Draw UI wireframes (Mermaid or ASCII) for Setup, Rules Editor, Projects List, Project Detail, Run, Floating Indicator.
36. Define theme tokens (colors, typography, spacing, elevations) via semantic tokens; no hardcoded Tailwind color utilities.
37. Define animation guidelines: hover expansion, panel dock/undock, floating indicator transitions.
38. Define keyboard shortcuts and accessibility requirements per panel.
39. Define error and validation states per surface with messages and recovery paths.
40. Define ambiguity list template and seed `.lovable/ambiguous-questions.md`.
41. Acceptance criteria: Header/Breadcrumb (dynamic title, back stack works).
42. Acceptance criteria: Floating Indicator (draggable, stoppable, jumpable, persists across pages).
43. Acceptance criteria: Rule Override (reference propagation and copy independence proven).
44. Acceptance criteria: Design Mode (draw, compile, SVG export/import round-trip).
45. Acceptance criteria: Flaw + Barcode primitives (rule pass/fail logic, chained events).
46. Acceptance criteria: Import/Export (JSON, YAML, SQLite zip parity at all three levels).
47. Acceptance criteria: Project Run (multi rule-set selection, override chain view, verification image preview).
48. Acceptance criteria: File System Layout (created next to EXE, exact folder structure).
49. Acceptance criteria: DB (all tables, PK naming `TableNameId`, ERD renders).
50. Acceptance criteria: Ambiguity list (every "?" in source captured with context).

### Phase 3: Steps 51-100 (UI Enhancement Implementation Plan)

51. Redesign top header: dynamic title slot, breadcrumb, Back button, remove duplicates.
52. Implement Back stack behavior per route with browser-like history semantics.
53. Build Setup landing with three enlarged animated tiles (Camera, Rules, Lighting).
54. Fix menu hover jitter by adjusting padding and using scale-only animation.
55. Remove Program option screen inside Rules.
56. Redesign rule-layers row: full width, right-aligned arrow, professional density.
57. Rebuild Layers panel as dockable/detachable window.
58. Rebuild Tools panel as dockable/detachable window.
59. Rebuild Preview panel with minimize/maximize.
60. Implement panel dock manager (drag, snap, save layout per user).
61. Implement default rule naming with sequence "Rule Set 01".
62. Implement rule creation modes selector (New / Category / Task-Based).
63. Implement rule override picker with Reference vs Copy toggle.
64. Implement Design Mode canvas with rect / circle / freehand.
65. Implement shape compile step and SVG export.
66. Implement shape import (SVG or image mask).
67. Implement OCR draw + validate on current image against backend endpoint.
68. Implement Flaw Detection primitive (rect + custom).
69. Implement Barcode/QR primitive with decoded-text chain.
70. Implement JS function library UI (list, edit, import, export).
71. Implement floating Validation indicator (drag, stop, click-jump).
72. Rebuild Projects list with recent dropdown on home.
73. Fix Project Create flow end-to-end.
74. Build Project Detail with Camera Settings, Rule Sets, Categories, AI Settings placeholder.
75. Build Project Run screen: multi rule-set select, override chain, verification images, Run button.
76. Build Category Manager UI.
77. Implement Category-based auto-apply rules.
78. Implement export flows: JSON, YAML, SQLite zip (rule, rule set, project).
79. Implement import flows for the same three formats.
80. Wire uploads to save under `data/{RuleSetName}/{RuleId}/`.
81. Wire all mutations to backend endpoints per the table in step 30.
82. Wire SQLite persistence layer with schema from step 31.
83. Implement Ambiguous Questions viewer surface (read-only).
84. Add animation polish per step 37 across all surfaces.
85. Add keyboard shortcuts per step 38.
86. Add accessibility passes per step 38.
87. Add error / validation states per step 39.
88. Add semantic tokens per step 36 to `src/styles.css` (no hardcoded colors).
89. Add end-to-end test: create rule set, override, run project, export, import.
90. Add integration test: backend endpoints happy + error paths.
91. Add unit tests: rule primitives, override resolver, import/export serializers.
92. Add visual regression snapshots for header, panels, floating indicator.
93. Fix any remaining Project section UI bugs surfaced by tests.
94. Verify PascalCase-in-data / user-friendly-in-UI rule across all forms.
95. Verify export/import round-trip parity across all three formats.
96. Verify override propagation (Reference) and independence (Copy).
97. Verify floating indicator works across route transitions.
98. Verify file system layout is created next to EXE at runtime.
99. Bump minor version, update `CHANGELOG.md` and `RELEASE_NOTES.md`, pin in `README.md`.
100.  Final ambiguity review pass: resolve or flag as blocking in `.lovable/ambiguous-questions.md`.

## Folder Placement

```text
spec/
  24-vision-inspection-ui/
    00-overview.md
    01-header-breadcrumb.md
    02-floating-process-indicator.md
    03-setup-camera.md
    04-setup-rules.md
    05-setup-lighting.md
    06-rules-editor-layout.md
    07-rule-creation-modes.md
    08-rule-override.md
    09-design-mode.md
    10-rule-primitives/
      rectangular.md
      circular.md
      custom-shape.md
      ocr.md
      presence-absence.md
      blob.md
      edge-width.md
      edge-pitch.md
      positional-adjustment.md
      color-mat.md
      text-read.md
    11-flaw-detection.md
    12-barcode-qr.md
    13-function-scripts.md
    14-projects-list.md
    15-project-create.md
    16-project-detail.md
    17-project-run.md
    18-category-manager.md
    19-import-export.md
    20-file-system-layout.md
    21-endpoints.md
    22-db-schema.md
    23-acceptance-criteria.md
    app-db/
      erd.mmd
      erd.png
      seq-rule-creation.mmd
      seq-rule-override.mmd
      seq-project-run.mmd
      seq-validation-stream.mmd
      component-overview.mmd
.lovable/
  ambiguous-questions.md
```

## Ambiguity Questions (Seed for `.lovable/ambiguous-questions.md`)

1. Should the header breadcrumb collapse on narrow desktop widths or always stay expanded?
2. Should the floating Validation indicator persist across app relaunches (resume-in-progress) or reset?
3. Reference-override: if the parent rule is deleted, does the child auto-detach as Copy or become invalid?
4. Are Category rules layered before or after project-specific rule sets in the override chain?
5. YAML export: should numeric tolerances use inline flow or block style?
6. SQLite zip export: encrypt with a user-provided passphrase or plain zip?
7. JS function scripts: sandbox with which runtime (QuickJS, Node vm, embedded V8)?
8. Barcode chain events: max chain depth to prevent cycles?
9. Custom-shape SVG import: which subset of SVG features is supported (paths only, or full)?
10. AI Settings placeholder: reserve which endpoints and DB columns now to avoid churn later?

## Coding Guidelines Reminder

Read `.lovable/coding-guidelines.md`, `.lovable/what-to-read.md`, root `README.md`, and any `/spec/coding-guideline/` and `/spec/error-manage/` folders. Follow Boolean, Enum, and error-management guidelines. Every catch must be logged. No `any`, `unknown`, or wide types. Files under 80-100 lines. Booleans prefixed with `is`/`has`. Variables assigned once (Rust-style). Assets under `/assets/xx-folder-name/xx-file-name.ext`.

## Acceptance Criteria (Top Level)

1. All 100 plan steps written and traceable to a spec file or implementation task.
2. Every endpoint has request/response JSON schema, auth requirement, and error taxonomy in a single table.
3. Every DB table has PascalCase name, integer auto-increment PK named `TableNameId`, and defined relationships.
4. Every UI surface has fields, states, validations, animations, and theme tokens defined.
5. ERD + sequence + component Mermaid diagrams render, with PNG renders in `app-db/`.
6. No implementation code is added in Phase 1 or Phase 2.
7. Every ambiguity is captured in `.lovable/ambiguous-questions.md` with context and blocking flag.

## Final Reminder To AI

Write spec first in detail for this given verbatim and tasks, and also plan first in memory and in `plan.md`. Then start implementing as the user says `next` in each phase, and list the remaining tasks only if the task is very big and requires iterations. If you have any question or confusion, feel free to ask. If you are creating multiple tasks and they are bigger ones, structure them so that when the user says `next` you continue the remaining tasks. Do you understand?

Also save any conversation under `/conversation/xx-feature/xx-title-of-conv.md` and index it in `/conversation/index.md`. When `next` is given, remind the AI of these instructions again.

# 100 steps Plan, Maximal Enforcement

Parse the number 100 in this prompt's header. That number is the EXACT count of steps in the plan you must write. Not 100-1. Not 100+1. If you cannot find it, STOP and ask.

## Rules — non-negotiable

1. DO NOT execute anything this turn. No code edits, no migrations, no installs. The only artifact this turn is the plan file (and any subtask / command / issue files described below) on disk.

2. DO NOT open plan mode. DO NOT call any plan-approval tool. No `plan--create`. No "should I proceed?" prompts. Write plain markdown files directly with the file-writing tools.

3. One task = one file. Path: `.lovable/plans/pending/XX-<slug>.md` where `XX` is the next free 2-digit sequence (01, 02, 03, …) under `pending/` AND `completed/` combined, and `<slug>` is lowercase-hyphenated.

4. Scan `.lovable/` first (every file, including memory + existing pending/completed plans + subtasks). Append any unresolved pending tasks into the new plan's pending list before producing the 100 steps.

5. Lifecycle:
   - New plan → `.lovable/plans/pending/XX-<slug>.md`

   - Task done → MOVE the file (using `mv`) to `.lovable/plans/completed/XX-<slug>.md`. Do not copy. Do not leave a duplicate in `pending/`.

   - Flip the `Status:` frontmatter from `pending` to `completed` in the same move.

6. Ambiguity = ask. If the request, scope, or 100 is unclear, ask clarifying questions FIRST. Do not invent steps to pad to 100.

## Subtasks — when a step needs more than one paragraph

If any step requires detailed explanation (more than ~3 lines, multiple files, non-obvious sequencing, or its own verification), DO NOT inline that detail in the main plan. Instead:

- Create `.lovable/plans/subtasks/XX-<slug>/` (matching the parent `XX-<slug>`).

- Inside it, write `SS-<subslug>.md` per subtask (`SS` is the 2-digit sequence within that subtask folder — 01, 02, 03, …).

- In the main plan, link to the subtask file in the step that needs it: `See ./subtasks/XX-<slug>/SS-<subslug>.md`.

- Subtask file uses the same frontmatter shape (`Slug`, `Status`, `Created`) plus `Parent: XX-<slug>`.

- Subtask lifecycle mirrors the plan: move completed subtask files to `.lovable/plans/subtasks/XX-<slug>/completed/` if needed, or flip their `Status:` in place.

## Commands and Issues — capture, don't lose

When the user gives input during a planning turn, route it to the correct file BEFORE writing the plan:

- Commands (the user tells you to do/configure/standardize something — "always do X", "from now on Y", a new convention, a new CLI invocation):

  → Append to `.lovable/spec/commands/XX-<slug>.md` (one file per command, `XX` is the next free sequence). Include: the command verbatim, scope, when it applies.

- Issues (the user reports a bug, regression, broken behavior, or symptom):

  → Append to `.lovable/issues/XX-<slug>.md`. Include: symptom, repro, expected vs actual, related files if known, status (`open`).

- If the folder does not exist, create it (`.lovable/spec/commands/` or `.lovable/issues/`).

- Reference the captured command/issue file from the plan's Context section so the link survives.

## Plan file shape (required)

```

# <Task title>



Slug: <slug>

Steps: 100

Status: pending

Created: <YYYY-MM-DD>



## Context



<1–3 sentences: what + why, files involved>

<Links to any captured commands/issues: .lovable/spec/commands/XX-…, .lovable/issues/XX-…>



## Steps



1. <step 1 — concrete, verifiable>

2. <step 2>

... exactly 100 items, no more, no less ...

   <Steps needing depth link to ./subtasks/XX-<slug>/SS-<subslug>.md>



## Verification



<how we'll know each step landed — build, logs, preview, tests, screenshots>



## Appended from prior pending tasks



<list any tasks pulled in from `.lovable/` scan, or "none">

```

## Checklist — every item ticked before you reply

- [ ] Parsed 100 from the prompt header

- [ ] Scanned `.lovable/` (memory + plans/ + subtasks/ + spec/commands/ + issues/) and listed prior pending tasks

- [ ] Captured any new commands → `.lovable/spec/commands/`

- [ ] Captured any new issues → `.lovable/issues/`

- [ ] Picked the next free `XX` sequence

- [ ] Wrote EXACTLY 100 steps — counted them

- [ ] Created subtask files under `.lovable/plans/subtasks/XX-<slug>/` for any step needing depth

- [ ] Saved the plan to `.lovable/plans/pending/XX-<slug>.md` with the required shape

- [ ] Did NOT execute the plan

- [ ] Did NOT call any plan-mode / plan-approval tool
