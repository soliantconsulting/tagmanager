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
            values: [ ],
            initialCap: true,
            backspaceChars: [ 8 ],
            deleteOnBackspace: true,
            delimiterChars: [ 13, 44, 188 ],
            maxTags: 0,
            createHandler: function(tag) {
                return;
            },
            deleteHandler: function(tag) {
                return;
            },
            createElementHandler: function(tagElement) {
                $($(tagElement).data('tagmanager')).before(tagElement);
            },
            duplicateHandler: function(tag, existingTagElement) {
                return tag;
            },
            validateHandler: function(tag) {
                return tag;
            }
        };

        $.extend(defaultOptions, options);
        $(this).data('options', defaultOptions);

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
            $(this).data('tagStrings', new Array());
            $(this).data('tagIds', new Array());

            var field = this;

            $('[id*="tag_"]').each(function(index, node) {
                if ($(this).data('tagmanager') == field)
                    $(this).remove();
            });
        });

        /**
         * Delete the last tag
         */
        $(this).on('pop', function (e) {
            if ($(this).data('tagIds').length > 0) {
                var id = $(this).data('tagIds')[$(this).data('tagIds').length - 1];

                $(this).trigger('delete', [ $('#' + id) ]);
            }
        });

        /**
         * Delete a tag
         */
        $(this).on('delete', function(e, tagHtml, skipAjax) {

            if ($(this).data('options').deleteHandler)
                $(this).data('options').deleteHandler($(tagHtml).attr('tag'));

            if ($(this).data('options').strategy == 'ajax'
                && $(this).data('options').ajaxDelete) {
                $.ajax({
                    url: $(this).data('options').ajaxDelete,
                    type: 'post',
                    data: {
                        tag: $(tagHtml).attr('tag')
                    },
                    dataType: 'json'
                });
            }

            var p = $.inArray($(tagHtml).attr('id'), $(this).data('tagIds'));
            $(this).data('tagStrings').splice(p, 1);
            $(this).data('tagIds').splice(p, 1);

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

            // Check max tags
            if ($(this).data('options').maxTags > 0
                && $(this).data('tagIds').length >= $(this).data('options').maxTags) {
                $(this).attr('originalPlaceholder', $(this).attr('placeholder'));
                $(this).attr('placeholder', 'Maximum of ' + $(this).data('options').maxTags + ' tags');
                $(this).val('');
                return;
            }

            // Caps first letter
            if ($(this).data('options').initialCap) {
                tag = tag.charAt(0).toUpperCase() + tag.slice(1);
            }

            // Validate Tag
            tag = $(this).data('options').validateHandler(tag);
            if (!tag) {
                $(this).val('');
                return;
            }

            // Check for duplicates and run handler
            var index = $.inArray(tag, $(this).data('tagStrings'));
            if (index != -1) {
                tag = $(this).data('options').duplicateHandler(tag, $('#' + $(this).data('tagIds')[index]));
            }
            if (!tag) {
                $(this).val('');
                return;
            }

            // Run ajax
            if ($(this).data('options').strategy == 'ajax' &&
                $(this).data('options').ajaxCreate != null
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
                $(this).data('options').createHandler(tag);

            // Build new tag
            var randomString = function(length) {
                var result = '';
                var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
                return result;
            };

            var tagId = 'tag_' + randomString(32);
            var newTagRemoveId = 'tag_remover_' + tagId;

            $(this).data('tagStrings').push(tag);
            $(this).data('tagIds').push(tagId);

            var tagHtml = $('<span></span>')
                .addClass('tagmanagerTag')
                .attr('tag', tag)
                .attr('id', tagId)
                .data('tagmanager', this)
                .text(tag);

            // Handle array strategy
            if ($(this).data('options').strategy == 'array') {
                $('<input></input>')
                    .attr('type', 'hidden')
                    .attr('name', $(this).data('options').tagFieldName)
                    .val(tag)
                    .appendTo(tagHtml);
            }

            // Build remove link
            var tagRemover = $('<a></a>')
                .addClass('tagmanagerRemoveTag')
                .attr('title', 'Remove')
                .attr('href', '#')
                .text('x')
                .appendTo(tagHtml);

            // Run create element handler
            $(this).data('options').createElementHandler(tagHtml);

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
                // backspace or equivalent
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

                // If the typeahead is selected use that value else use field value

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

        // Initialize the manager
        $(this).data('tagIds', new Array());
        $(this).data('tagStrings', new Array());

        // Pre-populate values
        if ($(this).data('options').values) {
            $(this).trigger('import',
                [ $(this).data('options').values ]);
        }
    }

});
