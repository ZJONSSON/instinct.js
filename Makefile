JS_UGLIFY = ./node_modules/uglify-js2/bin/uglifyjs2

JS_FILES = \
	instinct.js

all: \
	$(JS_FILES) \
	$(JS_FILES:.js=.min.js)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_UGLIFY) $< -c --comments -m -o $@