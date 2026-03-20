# termochi demo — run with: vhs demo.tape
# Install vhs: brew install vhs

Output assets/demo.gif

Set Shell "zsh"
Set FontSize 15
Set Width 1100
Set Height 580
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 80ms
Set PlaybackSpeed 0.8

# Launch
Type "termochi"
Sleep 500ms
Enter
Sleep 3s

# Main screen — let it sit, show GitHub widget
Sleep 3s

# Go to Stats
Type "i"
Sleep 3s

# Back to main
Type "q"
Sleep 1s

# Open Tasks
Type "t"
Sleep 2s

# Switch to Todo tab
Type "3"
Sleep 2s

# Back to main
Type "q"
Sleep 1s

# Open AI chat
Type "a"
Sleep 3s

# Send a message
Type "what should i work on today?"
Sleep 500ms
Enter
Sleep 5s

# Add a todo from chat
Type "/todo review the auth PR"
Sleep 300ms
Enter
Sleep 1s

# Close chat
Escape
Sleep 2s
