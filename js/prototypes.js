$(document).ready(function() {

    window.music = {};
    music.templates = {}
    music.prototypes = {};
    music.models = {};
    music.collections = {};
    music.views = {};

    music.prototypes.File = Backbone.DeepModel.extend({
        urlRoot: 'api/list_dir/',
    });

    music.prototypes.Files = Backbone.Collection.extend({
        model: music.prototypes.File,
        url: 'api/list_dir/',
        comparator: function(model) {
            return model.get('name');
        }
    });

    music.prototypes.NowPlayingInfoView = Backbone.View.extend({
        template: _.template($(now_playing_template).html()),
        events: {
        },
        initialize: function() {
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
        }
    });

    music.prototypes.PlayerControlsView = Backbone.View.extend({
        template: _.template($(player_controls_template).html()),
        events: {
            'click a.play': 'play',
            'click a.back': 'backward',
            'click a.stop': 'stop',
            'click a.forward': 'forward',
            'click a.volume': 'changeVolume',
            'click a.repeat': 'toggleRepeat',
        },
        initialize: function() {
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
        },
        play: function() {
            console.log('clicked play');
        },
        backward: function() {
            console.log('clicked backward');
        },
        stop: function() {
            console.log('clicked stop');
        },
        forward: function() {
            console.log('clicked forward');
        },
        changeVolume: function() {
            console.log('clicked changeVolume');
        },
        toggleRepeat: function() {
            console.log('clicked toggleRepeat');
        },
        setSongToPlay: function(model) {
            var playerEl = this.$el.find('#player');

            if (playerEl.attr('src') === "") {
                // If we aren't playing something, load the player with either the passed file
                // or the first item in the play list.

                if (model) {
                    playerEl.attr('src', model.get('path'));
                } else {
                    playerEl.attr('src', music.collections.currentPlaylist.at(0).get('path'));
                }
            }
        }
    });

    music.prototypes.PlaylistItemView = Backbone.View.extend({
        template: _.template($(playlist_item_row_template).html()),
        events: {
            'click': 'removeFromPlaylist'
        },
        initialize: function() {
            this.render();
            music.collections.currentPlaylist.add(this.model);
            console.log(this);
            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.$el, 'bind');
            bindings = _.extend(bindings, {
                id: [
                {
                    selector: '[bind=id]',
                    elAttribute: 'id',
                },
                {
                    selector: '[bind=name]',
                    elAttribute: 'text'
                },
                ],
            });
            this.modelBinder.bind(this.model, this.$el, bindings);
        },
        render: function() {
            this.$el.append(this.template(this.model.toJSON()));
        },
        removeFromPlaylist: function() {
            console.log('removing: ', this.model);
        }
    });

    music.prototypes.FileView = Backbone.View.extend({
        template: _.template($(list_row_template).html()),
        events: {
            'click a.list_row_item': 'click'
        },
        initialize: function() {
            this.render();
            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'bind');
            bindings = _.extend(bindings, {
                type: [
                {
                    selector: '[bind=type]',
                    elAttribute: 'class',
                    converter: function(direction, type) {
                    if (type === "directory") {
                        return "icon-folder-close";
                    } else {
                        return "icon-music";
                    }
                    }
                },
                {
                    selector: '[bind=name]',
                    elAttribute: 'text'
                },
                ],
                id: [
                {
                    selector: '[bind=id]',
                    elAttribute: 'id',
                    converter: function(direction, id) {
                        return id.replace(/=/g, '');
                    }
                }
                ]
            });
            this.modelBinder.bind(this.model, this.el, bindings);
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
        },
        click: function(e) {
            console.log('you clicked ' + this.model.get('name'));
            var self = this;
            console.log(self.model.attributes);
            if (this.model.get('type') === "directory") {
                var el = this.model.id.replace(/=/g, '');
                console.log(el ,$('#' + el));
                if (this.model.get("open")) {
                    $('#' + el).html('').hide();
                    this.model.unset('open');
                } else {
                    this.model.fetch({
                        success: function(model) {
                            var x = new music.prototypes.ListView({
                                collection: new music.prototypes.Files(model.get('files')),
                                parent: self,
                                el: $('#' + el),
                            });
                            self.model.set('open', 1);
                            $('#' + el).show();
                        }
                    });
                }
            } else {
                console.log("playAing song", this.model.get('path'));

                var x = new music.prototypes.PlaylistItemView({
                    model: this.model,
                    parent: this,
                    el: $('#playlist')
                });
            }

            return false;
        }
    });

    music.prototypes['ListView'] = Backbone.View.extend({
        template: _.template($(list_template).html()),
        initialize: function() {
            this.collection.bind('add', this.add, this);
            this.collection.bind('reset', this.render, this);
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
            var self = this;
            this.collection.each(function(account){
                self.add(account);
            });
        },
        add: function(file) {
            music.views[file.get('id')] = new music.prototypes.FileView({
                model: file,
                parent: this,
            });
            this.$el.append(music.views[file.get('id')].el);
        }
    });
});
