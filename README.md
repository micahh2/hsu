# HSU

The official HSU game. Play it in a modern browser!

## Starting the game locally

Download and install [nodejs](https://nodejs.org/)

Download the repository (git clone)
> git clone https://github.com/micahh2/hsu

Change your current directory
> cd hsu

Install dependancies

> npm i

Start local http server

> npm start

Open your browser to http://localhost:8080

## Development

Open your browser to http://localhost:8080
Edit one of the files, save it, and reload your browser.

## Git - The Basics

Git clone (will create dir "hsu"), you only need to do this once!
> git clone https://github.com/micahh2/hsu

**Git status** - show the overview of what's going on 
> git status

**Show un-added changes** (j/k -> up/down, q -> quit)
> git diff

**Add (stage) changes as ready to be committed** (don't forget tab can be used to autocomplete)
> git add file1.txt file2.txt

**Commit**
> git commit -m 'Commit message here'

**Show log of commits** (j/k -> up/down, q -> quit) 
> git log

**Get remote changes / updates**
> git pull

### If you have conflicts after pulling
View what files are conflicting
> git status

**Actually open the files, and fix the merge conflicts!!**

> git add someconflictingfile1.txt someconflictingfile2.txt

> git merge --continue

## Git - Sending Changes

#### Create changeset
> git format-patch --stdout > changenames.patch

Then email them to: ~electric/hsu@lists.sr.ht

#### Or, if you're using [git send-email](https://git-send-email.io)

> git send-email --to="~electric/hsu@lists.sr.ht" origin/master

#### Finaly, if you feel so inclined, create a fork or branch, push to it, and create a pull request within Github


## License

This software is licensed under [AGPL](https://www.gnu.org/licenses/agpl-3.0.en.html)
