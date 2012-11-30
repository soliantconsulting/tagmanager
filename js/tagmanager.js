var TagManager = (function () {
    function TagManager(element, options) {
        var defaults = {
            strategy: 'array',
            tagFieldName: 'tags[]',
            ajaxCreate: null,
            ajaxDelete: null,
            initialCap: true,
            backspaceChars: [
                8
            ],
            delimiterChars: [
                13, 
                44, 
                188
            ],
            createHandler: function (tagManager, tag, isImport) {
                return;
            },
            deleteHandler: function (tagManager, tag, isEmpty) {
                return;
            },
            createElementHandler: function (tagManager, tagElement, isImport) {
                tagManager.$element.before(tagElement);
            },
            validateHandler: function (tagManager, tag, isImport) {
                return tag;
            }
        };
        this.$element = $(element);
        this.tagIds = [];
        this.tagStrings = [];
        this.options = $.extend({
        }, defaults, options);
        $(element).data('tagmanager', this);
        this.listen();
    }
    TagManager.prototype.keypress = function (e) {
        if($.inArray(e.which, this.options.backspaceChars) != -1) {
            if(!this.$element.val()) {
                e.preventDefault();
                this.pop();
            }
        }
        if($.inArray(e.which, this.options.delimiterChars) != -1) {
            e.preventDefault();
            e.stopPropagation();
            if(this.$element.data('typeahead') && this.$element.data('typeahead').shown && this.$element.data('typeahead').$menu.find('.active').length) {
                return false;
            }
            this.create(this.$element.val());
        }
    };
    TagManager.prototype.empty = function () {
        var manager = this;
        $(this.tagIds).each(function (index, value) {
            manager.delete(value, true);
        });
    };
    TagManager.prototype.pop = function () {
        if(this.tagIds.length > 0) {
            this.delete(this.tagIds[this.tagIds.length - 1]);
        }
    };
    TagManager.prototype.delete = function (tagId, isEmpty) {
        var tagString = $('#' + tagId).attr('tag');
        if(this.options.deleteHandler) {
            this.options.deleteHandler(this, tagString, isEmpty);
        }
        if(this.options.strategy = 'ajax' && this.options.ajaxDelete && !isEmpty) {
            $.ajax({
                url: this.options.ajaxDelete,
                type: 'post',
                data: {
                    tag: tagString
                },
                dataType: 'json'
            });
        }
        var index = $.inArray(tagId, this.tagIds);
        this.tagStrings.splice(index, 1);
        this.tagIds.splice(index, 1);
        $('#' + tagId).remove();
    };
    TagManager.prototype.import = function (tags) {
        var manager = this;
        $.each(tags, function (key, val) {
            manager.create(val, true);
        });
    };
    TagManager.prototype.create = function (rawTag, isImport) {
        var tag = $.trim(rawTag);
        if(!tag) {
            this.$element.val('');
            return;
        }
        if(this.options.initialCap) {
            tag = tag.charAt(0).toUpperCase() + tag.slice(1);
        }
        tag = this.options.validateHandler(this, tag, isImport);
        if(!tag) {
            this.$element.val('');
            return;
        }
        if(this.options.strategy = 'ajax' && this.options.ajaxCreate && !isImport) {
            $.ajax({
                url: this.options.ajaxCreate,
                type: 'post',
                data: {
                    tag: tag
                },
                dataType: 'json'
            });
        }
        if(this.options.createHandler) {
            this.options.createHandler(this, tag, isImport);
        }
        var randomString = function (length) {
            var result = '';
            var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            for(var i = length; i > 0; --i) {
                result += chars[Math.round(Math.random() * (chars.length - 1))];
            }
            return result;
        };
        var id = 'tag_' + randomString(32);
        this.tagIds.push(id);
        this.tagStrings.push(tag);
        var tagClass = new Tag(this, id, tag);
        this.options.createElementHandler(this, tagClass.render(), isImport);
        this.$element.val('');
        this.$element.focus();
    };
    TagManager.prototype.listen = function () {
        this.$element.on('keypress', $.proxy(this.keypress, this));
    };
    return TagManager;
})();
var Tag = (function () {
    function Tag(manager, id, value) {
        this.setManager(manager);
        this.setId(id);
        this.setTag(value);
    }
    Tag.prototype.getManager = function () {
        return this.manager;
    };
    Tag.prototype.setManager = function (value) {
        this.manager = value;
        return this;
    };
    Tag.prototype.getId = function () {
        return this.id;
    };
    Tag.prototype.setId = function (value) {
        this.id = value;
        return this;
    };
    Tag.prototype.getTag = function () {
        return this.tag;
    };
    Tag.prototype.setTag = function (value) {
        this.tag = value;
        return this;
    };
    Tag.prototype.validate = function () {
        if(this.getManager().options.strategy == 'array' && !this.getManager().options.tagFieldName) {
            alert('Array strategy used with no field name');
        }
    };
    Tag.prototype.render = function () {
        this.validate();
        var tagHtml = $('<span />').addClass('tagmanagerTag').attr('tag', this.getTag()).attr('id', this.getId()).data('tagmanager', this.getManager()).text(this.getTag());
        if(this.getManager().options.strategy == 'array') {
            $('<input>').attr('type', 'hidden').attr('name', this.getManager().options.tagFieldName).val(this.getTag()).appendTo(tagHtml);
        }
        var tagRemover = $('<a />').addClass('tagmanagerRemoveTag').attr('title', 'Remove').attr('href', '#').text('x').appendTo(tagHtml);
        var id = this.getId();
        var manager = this.getManager();
        $(tagRemover).click(function (e) {
            manager.delete(id);
            return false;
        });
        return tagHtml;
    };
    return Tag;
})();
$.fn.tagmanager = function (option) {
    return this.each(function () {
        var $this = $(this), data = $this.data('tagmanager'), options = typeof option == 'object' && option;
        if(!data) {
            $this.data('tagmanager', (data = new TagManager(this, options)));
        }
        if(typeof option == 'string') {
            data[option]();
        }
    });
};
