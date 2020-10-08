# HSU

The official HSU game. Play it in a modern browser!

## Starting the game

Download the repository, open index.html

## Development

Edit a file. Save and reload.

## Git - The Basics

Git clone (will create dir "hsu"), you only need to do this once!
> git clone https://git.sr.ht/~electric/hsu

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

Then email them to ~sircmpwn/email-test-drive@lists.sr.ht

#### or if you're using `git send-email` (https://git-send-email.io)

> git format-patch --to="~electric/hsu@lists.sr.ht"

## License

This software is licensed under [AGPL](https://www.gnu.org/licenses/agpl-3.0.en.html)
