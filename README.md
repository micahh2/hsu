# HSU

The official HSU game. Play it in a modern browser!

## Starting the game locally

Download and install [nodejs](https://nodejs.org/)

Download the repository (git clone)

    git clone https://github.com/micahh2/hsu

Change your current directory

    cd hsu

Install dependancies

    npm i

Start local http server

    npm start

Open your browser to http://localhost:8080

## Development

Edit one of the files, save it, and reload your browser.


## Testing

To start the test runner:

    npm test

To generate a test report (test-report.txt)

    npm run test-report

## Documentation

Documentation can be found on the demo website [here](https://micah.dvyld.com/hsu/docs).

Building documentation

    npm run build-docs

Starting local server for documentation

    npm run serve-docs

## Linting

The project uses Airbnb's eslint style guide.
To run the linter and show errors:

    npm run lint

To run the linter and auto-fix simple mistakes:

    npm run fix-lint

While you do not need to do this before making a commit, it is encouraged.
There are also a number of [editor plugins](https://eslint.org/docs/user-guide/integrations#editors) that can show you linter errors and make it easier to write complient code.

## License

This software is licensed under [AGPL](https://www.gnu.org/licenses/agpl-3.0.en.html)
