/**
 * ===================================================
 * Tag Manager
 * http://soliantconsulting.github.com/tagmanager/
 * ===================================================
 * Copyright 2012 Soliant Consulting
 * http://www.soliantconsulting.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ==========================================================
 */

/// <reference path="jquery.d.ts" />

declare function require(name: string);

class TagManager {

    options;
    tagIds;
    tagStrings;
    $element;

    constructor(element, options) {

        var defaults = {
            strategy: 'array'
            , tagFieldName: 'tags[]'
            , ajaxCreate: null
            , ajaxRemove: null
            , initialCap: true
            , backspaceChars: [ 8 ]
            , delimiterChars: [ 13, 44, 188 ]
            , createHandler: function(tagManager, tag, isImport?) {
                return;
            }
            , removeHandler: function(tagManager, tag, isEmpty?) {
                return true;
            }
            , createElementHandler: function(tagManager, tagElement, isImport?) {
                tagManager.$element.before(tagElement);
            }
            , validateHandler: function(tagManager, tag, isImport?) {
                return tag;
            }
        };

        this.$element = $(element);
        this.tagIds = [ ];
        this.tagStrings = [ ];
        this.options = $.extend({}, defaults, options);

        $(element).data('tagmanager', this);
        this.listen();
    }

    /**
     * If a delimiting key is pressed, add the current value
     * If backspace then remove latest tag
     */
    keypress(e) {
        if ($.inArray(e.which, this.options.backspaceChars) != -1) {
            if (!this.$element.val()) {
                e.preventDefault();
                this.pop();
            }
        }

        if ($.inArray(e.which, this.options.delimiterChars) != -1) {
            e.preventDefault();
            e.stopPropagation();

            // If the bootstrap typeahead is active use that value else use field value
            if (this.$element.data('typeahead') &&
                this.$element.data('typeahead').shown &&
                this.$element.data('typeahead').$menu.find('.active').length
            ) {
                return false;
            }

            this.create(this.$element.val());
        }
    }

    /**
     * Empty the tag manager
     */
    empty() {
        var manager = this;
        $(this.tagIds).each(function(index, value) {
            manager.remove(value, true);
        });
    }

    /**
     * Remove the last tag
     */
    pop() {
        if (this.tagIds.length > 0) {
            this.remove(this.tagIds[this.tagIds.length - 1]);
        }
    }

    /**
     * Remove/delete a tag
     */
    remove(tagId: string, isEmpty?: bool) {
        var tagString = $('#' + tagId).attr('tag');

        if (this.options.removeHandler)
            if (!this.options.removeHandler(this, tagString, isEmpty))
                return;

        if (this.options.strategy == 'ajax'
            && this.options.ajaxRemove
            && !isEmpty) {

            $.ajax({
                url: this.options.ajaxRemove
                , type: 'post'
                , data: {
                    tag: tagString
                }
                , dataType: 'json'
            });
        }

        var index = $.inArray(tagId, this.tagIds);
        this.tagStrings.splice(index, 1);
        this.tagIds.splice(index, 1);

        $('#' + tagId).remove();
    }

    /**
     * Create prefilled tags without triggering ajaxCreate
     */
    populate(tags) {
        var manager = this;
        $.each(tags, function(key, val) {
            manager.create(val, true);
        });
    }

    /**
     * Create a new tag
     */
    create(rawTag: string, isImport?: bool) {
        var tag = $.trim(rawTag);
        if (!tag) {
            this.$element.val('');
            return;
        }

        if (this.options.initialCap)
            tag = tag.charAt(0).toUpperCase() + tag.slice(1);

        tag = this.options.validateHandler(this, tag, isImport);
        if (!tag) {
            this.$element.val('');
            return;
        }

        if (this.options.strategy == 'ajax'
            && this.options.ajaxCreate
            && !isImport) {

            $.ajax({
                url: this.options.ajaxCreate
                , type: 'post'
                , data: {
                    tag: tag
                }
                , dataType: 'json'
            });
        }

        if (this.options.createHandler)
            this.options.createHandler(this, tag, isImport);

        // Build new tag
        var randomString = function(length) {
            var result = '';
            var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
            return result;
        };

        var id = 'tag_' + randomString(32);
        this.tagIds.push(id);
        this.tagStrings.push(tag);
        var tagClass = new Tag(this, id, tag);

        // Run create element handler
        this.options.createElementHandler(this, tagClass.render(), isImport);

        this.$element.val('');
        this.$element.focus();
    }

    listen() {
        this.$element.on('keypress', $.proxy(this.keypress, this));
    }
}

class Tag {
    id: string;
    tag: string;
    manager;

    constructor (manager, id: string, value: string) {
        this.manager = manager;
        this.id = id;
        this.tag = value;
    }

    validate() {
        if (this.manager.options.strategy == 'array' && !this.manager.options.tagFieldName) {
            alert('Array strategy used with no field name');
            // throw exception
        }
    }

    render() {

        this.validate();

        var tagHtml = $('<span />')
            .addClass('tagmanagerTag')
            .attr('tag', this.tag)
            .attr('id', this.id)
            .data('tagmanager', this.manager)
            .text(this.tag);

        // Handle array strategy
        if (this.manager.options.strategy == 'array') {
            $('<input>')
                .attr('type', 'hidden')
                .attr('name', this.manager.options.tagFieldName)
                .val(this.tag)
                .appendTo(tagHtml);
        }

        // Build remove link
        var tagRemover = $('<a />')
            .addClass('tagmanagerRemoveTag')
            .attr('title', 'Remove')
            .attr('href', '#')
            .text('x')
            .appendTo(tagHtml);

        var id = this.id;
        var manager = this.manager;

        $(tagRemover).click(function(e) {
            manager.remove(id);
            return false;
        });

        return tagHtml;
    }
}

/**
 * Register the function
 */
$.fn.tagmanager = function (option) {
    return this.each(function () {
        var $this = $(this)
        , data = $this.data('tagmanager')
        , options = typeof option == 'object' && option
        if (!data) $this.data('tagmanager', (data = new TagManager(this, options)))
        if (typeof option == 'string') data[option]()
    })
}
