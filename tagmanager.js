/**
 * ===================================================
 * Tag Manager
 * https://tagmanager-tomanderson.rhcloud.com
 * ===================================================
 * Copyright 2012 Soliant Consulting
 *
 * Licensed under the Mozilla Public License, Version 2.0 You may not use
 * this work except in compliance with the License.
 *
 * http://www.mozilla.org/MPL/2.0/
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==========================================================
 */

$(function() {

    "use strict"; // jshint ;_;

    $.fn.tagManager = function(options) {
        var defaultOptions = {
            strategy: 'array',
            tagFieldName: 'tags[]',
            ajaxCreate: null,
            ajaxDelete: null,
            initialCap: true,
            backspaceChars: [ 8 ],
            deleteOnBackspace: true,
            delimiterChars: [ 13, 44, 188 ],
            createHandler: function(tagManager, tag) {
                return;
            },
            deleteHandler: function(tagManager, tag) {
                return;
            },
            createElementHandler: function(tagManager, tagElement) {
                $(tagManager).before(tagElement);
            },
            duplicateHandler: function(tagManager, tag, existingTagElement) {
                return tag;
            },
            validateHandler: function(tagManager, tag) {
                return tag;
            }
        };

        $.extend(defaultOptions, options);
        $(this).data('options', defaultOptions);
        $(this).data('tagIds', new Array());
        $(this).data('tagStrings', new Array());

        /**
         * Bind remove tag icon
         */
        $('a.tagmanagerRemoveTag').live('click', function(e) {
            $($(this).parent().data('tagmanager')).trigger('delete',
                [ $(this).parent() ]);
            return false;
        });

        /**
         * Empty the tag manager
         */
        $(this).on('empty', function(e) {
            var tagmanager = this;
            $($(this).data('tagIds')).each(function(index, value) {
                $(tagmanager).trigger('delete', [ $('#' + value), true ]);
            });
        });

        /**
         * Delete the last tag
         */
        $(this).on('pop', function (e) {
            if ($(this).data('tagIds').length > 0) {
                $(this).trigger('delete', [ $('#' +
                    $(this).data('tagIds')[$(this).data('tagIds').length - 1]) ]);
            }
        });

        /**
         * Delete a tag
         */
        $(this).on('delete', function(e, tagHtml, skipAjax) {

            if ($(this).data('options').deleteHandler)
                $(this).data('options').deleteHandler($(this), $(tagHtml).attr('tag'));

            if ($(this).data('options').strategy == 'ajax'
                && $(this).data('options').ajaxDelete
                && !skipAjax) {
                $.ajax({
                    url: $(this).data('options').ajaxDelete,
                    type: 'post',
                    data: {
                        tag: $(tagHtml).attr('tag')
                    },
                    dataType: 'json'
                });
            }

            var index = $.inArray($(tagHtml).attr('id'), $(this).data('tagIds'));
            $(this).data('tagStrings').splice(index, 1);
            $(this).data('tagIds').splice(index, 1);

            $(tagHtml).remove();
        });

        /**
         * Add a new tag
         */
         $(this).on('create', function (e, tag, skipAjax)
         {
            var tag = $.trim(tag);
            if (!tag) {
                $(this).val('');
                return;
            }

            // Caps first letter
            if ($(this).data('options').initialCap) {
                tag = tag.charAt(0).toUpperCase() + tag.slice(1);
            }

            // Validate Tag
            tag = $(this).data('options').validateHandler($(this), tag);
            if (!tag) {
                $(this).val('');
                return;
            }

            // Check for duplicates and run handler
            var index = $.inArray(tag, $(this).data('tagStrings'));
            if (index != -1) {
                tag = $(this).data('options').duplicateHandler($(this), tag, $('#' + $(this).data('tagIds')[index]));
            }
            if (!tag) {
                $(this).val('');
                return;
            }

            // Run ajax
            if ($(this).data('options').strategy == 'ajax'
                && $(this).data('options').ajaxCreate != null
                && !skipAjax) {
                $.ajax({
                    url: $(this).data('options').ajaxCreate,
                    type: 'post',
                    data: {
                        tag: tag
                    },
                    dataType: 'json'
                });
            }

            // Run create handler
            if ($(this).data('options').createHandler)
                $(this).data('options').createHandler($(this), tag);

            // Build new tag
            var randomString = function(length) {
                var result = '';
                var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
                return result;
            };

            var tagId = 'tag_' + randomString(32);
            var newTagRemoveId = 'tag_remove_' + tagId;

            $(this).data('tagStrings').push(tag);
            $(this).data('tagIds').push(tagId);

            var tagHtml = $('<span />')
                .addClass('tagmanagerTag')
                .attr('tag', tag)
                .attr('id', tagId)
                .data('tagmanager', this)
                .text(tag);

            // Handle array strategy
            if ($(this).data('options').strategy == 'array') {
                $('<input>')
                    .attr('type', 'hidden')
                    .attr('name', $(this).data('options').tagFieldName)
                    .val(tag)
                    .appendTo(tagHtml);
            }

            // Build remove link
            var tagRemover = $('<a />')
                .addClass('tagmanagerRemoveTag')
                .attr('title', 'Remove')
                .attr('href', '#')
                .text('x')
                .appendTo(tagHtml);

            // Run create element handler
            $(this).data('options').createElementHandler($(this), tagHtml);

            $(this).val('');
            $(this).focus();
        });

        /**
         * Import prefilled tags without triggering ajaxCreate
         */
        $(this).on('import', function (e, tags) {
            var field = this;

            if (typeof (tags) == "object") {
                $.each(tags, function (key, val) {
                    $(field).trigger('create', [ val, true ]);
                });
            } else if (typeof (tags) == "string") {
                $.each(tags.split(','), function (key, val) {
                    $(field).trigger('create', [ val, true ]);
                });
            }
        });

        /**
         * Prevent submit on enter
         */
        $(this).keypress(function(e) {
            if (e.which == 13
                && $.inArray(e.which, $(this).data('options').delimiterChars) != -1) {
                e.stopPropagation();
                e.preventDefault();
            }
        });

        /**
         * If backspace then delete latest tag
         */
        $(this).keydown(function(e) {
            if ($.inArray(e.which, $(this).data('options').backspaceChars) != -1) {
                if (!$(this).val()) {
                    e.preventDefault();
                    $(this).trigger('pop');
                }
            }
        });

        /**
         * If a delimiting key is pressed, add the current value
         */
        $(this).keyup(function (e) {
            if ($.inArray(e.which, $(this).data('options').delimiterChars) != -1) {
                e.preventDefault();

                // If the bootstrap typeahead is active use that value else use field value
                if ($(this).data('typeahead')
                    && $(this).data('typeahead').shown
                    && $(this).data('typeahead').$menu.find('.active').length
                ) {
                    return false;
                    $(this).val($(this).data('typeahead').$menu.find('.active').attr('data-value'));
                }

                // For non enter keystrokes trim last character from value
                if (e.which != 13)
                    $(this).val($(this).val().substr(0, $(this).val().length -1));

                $(this).trigger('create', [ $(this).val() ]);
            }
        });
    }
});
