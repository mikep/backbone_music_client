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

    music.prototypes.ID3Tags = Backbone.DeepModel.extend({
        urlRoot: 'api/song_info/'
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
            _.bindAll(this);
            this.render();
            this.setModelBindings();
        },
        setModelBindings: function() {
            if (!this.model) {
                this.model = new music.prototypes.ID3Tags();
            }
            
            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'bind');
            bindings = _.extend(bindings, {
                image: [
                    {
                        selector: '#album_art',
                        elAttribute: 'src',
                        converter: function(direction, image) {
                            if (image) {
                                return "/backbone/srv/www/" + image;
                            } else {
                                return "img/album.jpg";
                            }
                        }
                    }
                ],
            });
            this.modelBinder.bind(this.model, this.el, bindings);

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
            _.bindAll(this);
            this.render();
            this.$el.find('#player').bind('ended', this.logger);
            this.$el.find('#player').bind('play', this.setID3Data);
        },
        render: function() {
            this.$el.html(this.template());
        },
        play: function() {
            console.log('clicked play');
        },
        backward: function() {
            // Backwards button skips back 10 seconds
            $('#player')[0].currentTime = $('#player')[0].currentTime - 10;
        },
        stop: function() {
            console.log('clicked stop');
        },
        forward: function() {
            console.log('clicked forward');
        },
        changeVolume: function(e) {
            var volume = this.$el.find('#player')[0].volume;
            if (volume === 0) {
                if (!this.currentVolume) {
                    this.currentVolume = 1;
                };

                this.$el.find('#player')[0].volume = this.currentVolume;

                if (e.target.tagName === 'A') {
                    $(e.target).find('i').removeClass('icon-volume-off').addClass('icon-volume-up');
                } else {
                    $(e.target).removeClass('icon-volume-off').addClass('icon-volume-up');
                }
            } else {
                this.currentVolume = volume;

                this.$el.find('#player')[0].volume = 0;

                if (e.target.tagName === 'A') {
                    $(e.target).find('i').removeClass('icon-volume-up').addClass('icon-volume-off');
                } else {
                    $(e.target).removeClass('icon-volume-up').addClass('icon-volume-off');
                }
            }
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
                    this.model = model;
                } else {
                    playerEl.attr('src', music.collections.currentPlaylist.at(0).get('path'));
                    this.model = music.collections.currentPlaylist.at(0);
                }
            }

        },
        setID3Data: function() {
            console.log(this.model);
            music.views.nowPlaying.model = this.model.get('id3Data');
            // FIXME: This should be bound to model change in the view.
            music.views.nowPlaying.setModelBindings();
        },
        logger: function(e) {
            console.log(this);
            console.log(e);
            console.trace();
        }
    });


    music.prototypes.PlaylistItemView = Backbone.View.extend({
        template: _.template($(playlist_item_row_template).html()),
        events: {
            'click': 'removeFromPlaylist'
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            music.collections.currentPlaylist.add(this.model);

            this.fetchID3Data();
        },
        setModelBindings: function() {            
            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'bind');
            bindings = _.extend(bindings, {
                id: [
                    {
                        selector: '[bind=id]',
                        elAttribute: 'id',
                    },
                ],
                id3Data: [
                    {
                        selector: '[bind=artist]',
                        elAttribute: 'text',
                        converter: function(direction, id3) {
                            return id3.get('artist')[0];
                        }
                    },
                    {
                        selector: '[bind=title]',
                        elAttribute: 'text',
                        converter: function(direction, id3) {
                            return id3.get('title')[0];
                        }
                    },
                ],
            });
            this.modelBinder.bind(this.model, this.el, bindings);
        },
        render: function() {
            this.$el.html(this.template());
        },
        removeFromPlaylist: function() {
            console.log('removing: ', this.model);
            music.collections.currentPlaylist.remove(this.model.id);
            this.undelegateEvents();
            this.remove();
        },
        fetchID3Data: function() {
            this.model.set({
                'id3Data': new music.prototypes.ID3Tags({id: this.model.id})
            });

            var self = this;
            this.model.get('id3Data').fetch({
                success: function() {
                    self.setModelBindings();
                }
            });
        }
    });

    music.prototypes.FileView = Backbone.View.extend({
        template: _.template($(list_row_template).html()),
        events: {
            'click a.list_row_item': 'click'
        },
        initialize: function() {
            _.bindAll(this);
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
            this.$el.html(this.template());
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
                });
                $('#playlist').append(x.el);
            }

            return false;
        }
    });

    music.prototypes['ListView'] = Backbone.View.extend({
        template: _.template($(list_template).html()),
        initialize: function() {
            _.bindAll(this);
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
