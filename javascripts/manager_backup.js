function Contact(data, id) {
  this.id = id || data.id;
  this.name = data.name || '';
  this.email = data.email || '';
  this.phone = data.phone || '';
  this.tags = data.tags || [];
}

Contact.prototype = {
  update: function(data) {
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.tags = data.tags;
  },

  hasTag: function(tag) {
    return this.tags.indexOf(tag) !== -1;
  },
}

var Contacts = {
  list: [],
  lastId: 0,
  tags: [],
  activeTags: [],

  add: function(data) {
    this.list.push(new Contact(data, this.nextId()));
    this.addTags(data.tags);
    this.save();
  },

  update: function(data) {
    var index = this.getIndex(data.id);
    var contact = this.list[index];
    // var oldTags = this.list[index].tags;
    var oldTags = contact.tags;
    // this.list[this.getIndex(data.id)] = new Contact(data);
    contact.update(data);
    // this.addTags(data.tags);
    // this.removeTags(oldTags);
    this.updateTags(data.tags, oldTags);
    this.save();
  },

  remove: function(id) {
    this.removeTags(this.removeContact(id).tags);
    this.save();
  },

  removeContact: function(id) {
    return this.list.splice(this.getIndex(id), 1)[0];
  },

  addTags: function(tags) {
    var self = this;
    var addedTags = [];
    tags.forEach(function(tag) {
      if (self.tags.indexOf(tag) === -1) {
        addedTags.push(tag);
      }
    });

    [].push.apply(self.tags, addedTags);
    return addedTags;
  },

  updateTags: function(toAdd, toRemove) {
    this.addTags(toAdd);
    this.removeTags(toRemove);
  },

  removeTags: function(tags) {
    var self = this;
    var canDelete;
    var removedTags = [];
    tags.forEach(function(tag) {
      // canDelete = self.list.every(function(contact) {
      //   return !contact.hasTag(tag);
      // });
      //
      // if (canDelete) {
      if (!self.tagExists(tag)) {
        // self.tags.splice(self.tags.indexOf(tag), 1);
        self.removeTag(tag);
        // var activeTagIndex = self.activeTags.indexOf(tag);
        // if (activeTagIndex !== -1) {
        //   self.activeTags.splice(activeTagIndex, 1);
        // }
        self.removeActiveTag(tag);
        removedTags.push(tag);
      }
    });

    return removedTags;
  },

  removeTag: function(tag) {
    this.tags.splice(this.tags.indexOf(tag), 1);
  },

  removeActiveTag: function(tag) {
    var activeTagIndex = this.activeTags.indexOf(tag);
    if (activeTagIndex !== -1) {
      this.activeTags.splice(activeTagIndex, 1);
    }
  },

  tagExists: function(tag) {
    return this.list.some(function(contact) {
      return contact.hasTag(tag);
    });
  },

  activeTagIndex: function(tagName) {
    return this.activeTags.findIndex(function(tag) {
      return tag === tagName;
    });
  },

  toggleActiveTag: function(tag) {
    if (this.activeTagIndex(tag) !== -1) {
      this.activeTags.splice(this.activeTagIndex(tag), 1);
    } else {
      this.activeTags.push(tag);
    }
  },

  toggleActiveTags: function(tags) {
    tags.forEach(this.toggleActiveTag.bind(this));
  },

  get: function(id) {
    return this.list.find(function(contact) {
      return contact.id === id;
    });
  },

  getIndex: function(id) {
    return this.list.findIndex(function(contact) {
      return contact.id === id;
    });
  },

  filterByName: function(query) {
    // found on stackoverflow... escapes characters used commonly in
    // regular expressions
    query = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    var regex = new RegExp(query, 'i');
    return this.list.filter(function(contact) {
      return contact.name.match(regex);
    });
  },

  filterByTags: function() {
    var self = this;
    if (self.activeTags.length === 0) { return self.list; }

    return self.list.filter(function(contact) {
      // return self.activeTags.some(function(tag) {
      //   return contact.tags.indexOf(tag) !== -1;
      // });
      return self.activeTags.some(contact.hasTag.bind(contact));
    });
  },

  load: function() {
    // var contactsJson = JSON.parse(localStorage.getItem('contacts')) || [];
    // this.list = contactsJson.map(function(data) {
    //   return (new Contact(data));
    // });
    this.loadContacts();
    // this.tags = JSON.parse(localStorage.getItem('tags')) || [];
    this.loadTags();
    this.setLastId();
  },

  loadContacts: function() {
    var contactsJson = JSON.parse(localStorage.getItem('contacts')) || [];
    this.list = contactsJson.map(function(data) {
      return (new Contact(data));
    });

  },

  loadTags: function() {
    var uniqueTags = [];
    // get all tags for all contacts
    var contactTags = this.list.map(function(contact) {
      return contact.tags;
    });

    // flatten array of arrays of tags
    // contactTags = contactTags.reduce(function(a, b) {
    //   return a.concat(b);
    // }, []);
    // contactTags = flatten(contactTags);

    // extract unique tags
    // contactTags.forEach(function(tag) {
    //   if (uniqueTags.indexOf(tag) === -1) {
    //     uniqueTags.push(tag);
    //   }
    // });
    uniqueTags = unique(flatten(contactTags));

    this.tags = uniqueTags;
    return uniqueTags;
  },

  save: function() {
    localStorage.setItem('contacts', JSON.stringify(this.list));
    // localStorage.setItem('tags', JSON.stringify(this.tags))
  },

  nextId: function() {
    this.lastId++;
    return this.lastId;
  },

  setLastId: function() {
    if (this.list.length === 0) { return 0; }

    // var ids = this.list.reduce(function(ids, contact) {
    //   ids.push(+contact.id);
    //   return ids;
    // }, []);
    var ids = pluck(this.list, 'id');
    this.lastId = Math.max.apply(Math, ids);
  }
}


var App = {
  templates: {},
  cacheTemplates: function() {
    var self = this;
    $('script[type="text/x-handlebars"]').each(function() {
      var $tmpl = $(this);
      self.templates[$tmpl.attr('id')] = Handlebars.compile($tmpl.html());
    });
  },

  registerPartials: function() {
    $('script[data-type="partial"]').each(function() {
      var $partial = $(this);
      Handlebars.registerPartial($partial.attr('id'), $partial.html());
    });
  },

  removeHandlebarsScripts: function() {
    $('script[type="text/x-handlebars"]').remove();
  },

  add: function(e) {
    e.preventDefault();
    var f = e.currentTarget;
    var formData = this.getFormData($(f));

    if (formData.id) {
      Contacts.update(formData);
    } else {
      Contacts.add(formData);
    }
    this.writeContacts(this.filterByName());
    this.showContacts();
    this.resetForm();
  },

  resetForm: function() {
    var $f = $('form');
    $f.find('input[name]').val("");
  },

  loadContacts: function() {
    Contacts.load();
  },

  writeContacts: function(filtered) {
    var list = Contacts.list;
    if (filtered) { list = filtered; }
    $('#contacts').html(this.templates.contacts_template({ contacts: list }));
    $('#tag_list').html(this.templates.tag_list_template({ tags: Contacts.tags }));

    $('#contacts > li').hide();
  },

  showContacts: function() {
    $('form').slideUp(600);
    $('#contacts, .actions').slideDown(600);
    if (Contacts.tags.length > 0) {
      $('#tag_list').slideDown(600);
    } else {
      $('#tag_list').slideUp(600);
    }

    var filtered = $('.tag').filter(function(index, tag) {
      return Contacts.activeTags.some(function(activeTag) {
        return tag.textContent === activeTag;
      });
    })
    filtered.addClass('active');

    this.showOnlyContacts(Contacts.filterByTags());
  },

  showForm: function(e) {
    $('form').slideDown(600);
    $('#contacts, .actions').slideUp(600);
  },

  showAddForm: function() {
    $('form h2').text('Create Contact');
    this.showForm();
  },

  showEditForm: function() {
    $('form h2').text('Edit Contact');
    this.showForm();
  },

  loadForm: function(id) {
    var contact = {};
    if (id) {
      contact = Contacts.get(id);
    }
    $('form').html(this.templates.form_template(contact));
  },

  getFormData: function($form) {
    return {
      id: +$form.find('input[name="id"]').val(),
      name: $form.find('#name').val(),
      email: $form.find('#email').val(),
      phone: $form.find('#phone').val(),
      tags: parseTags($form.find('#tags').val()),
    }
  },

  edit: function(e) {
    var $contact = $(e.target).closest('li');
    var id = +$contact.attr('data-id');
    this.loadForm(id);
    this.showEditForm();
  },

  remove: function(e) {
    var self = this;
    var $contact = $(e.target).closest('li');
    var id = +$contact.attr('data-id');
    Contacts.remove(id);
    $contact.slideUp(600);
    setTimeout(function() {
      self.writeContacts(self.filterByName());
      self.showContacts();
    }, 600);
  },

  filterByName: function(e) {
    return Contacts.filterByName($('#search').val());
  },

  showFilter: function(e) {
    var query = e.target.textContent;
    var filteredList = this.filterByName();
    if (query || filteredList.length > 0) {
      this.writeContacts(filteredList);
      this.showContacts();
      $('#empty_result').slideUp(600);
    } else {
      $('#empty_result').slideDown(600);
      $('#contacts').slideUp(600);
      $('#empty_result span').text($('#search').val());
    }
  },

  tagClickEvent: function(e) {
    var $clickedTag = $(e.target);

    if ($('form:visible').length === 1) {
      this.addTagToInput(e);
    } else {
      var tagName = $clickedTag.text();
      var $matchedTags = $('.tag').filter(function(index, tag) {
        return tag.textContent === tagName;
      });

      Contacts.toggleActiveTag(tagName);
      $matchedTags.toggleClass('active');
      this.showOnlyContacts.call(this, Contacts.filterByTags());
    }
  },

  addTagToInput: function(e) {
    var $clickedTag = $(e.target);
    var $tagsInput = $('#tags');
    var tagsText = $tagsInput.val();
    if (tagsText.trim() === "") {
      $tagsInput.val($clickedTag.text());
    } else {
      $tagsInput.val(tagsText + ', ' + $clickedTag.text());
    }

  },

  showOnlyContacts: function(contacts) {
    function hasIdInList(contact, list) {
      return list.some(function(contactObj) {
        return +contact.getAttribute('data-id') === contactObj.id;
      });
    }

    $('#contacts > li').each(function(index, contact) {
      if (hasIdInList(contact, contacts)) {
        $(contact).slideDown(600);
      } else {
        $(contact).slideUp(600);
      }
    });
  },

  bindEvents: function() {
    $('.actions a').on('click', this.showAddForm.bind(this));
    $('form').on('click', '#cancel', this.showContacts.bind(this));
    $('form').on('submit', this.add.bind(this));
    $('#contacts').on('click', '.edit', this.edit.bind(this));
    $('#contacts').on('click', '.delete', this.remove.bind(this));
    $('#search').on('input', this.showFilter.bind(this));
    $('main').on('click', '.tag', this.tagClickEvent.bind(this));
  },

  init: function() {
    this.cacheTemplates();
    this.registerPartials();
    this.removeHandlebarsScripts();
    this.loadForm();
    this.loadContacts();
    if (Contacts.list.length < 10) {
      for (var i = 0, len = data.length; i <= len * .10; i++) {
        Contacts.add(data[i]);
      }
    }
    this.writeContacts();
    this.showContacts();
    this.showFilter = debounce(this.showFilter.bind(this), 300);
    this.bindEvents();
  }
}

$(App.init.bind(App));

function parseTags(tags) {
  // parse tag string into words delimited by a comma
  tags = tags.trim().replace(/(\s*,+\s*)+/g, ',');
  tags = tags.replace(/^,+|,+$/g, '');
  return tags ? tags.split(',') : [];
}

function stringifyTags(tagsArray) {
  return tagsArray.join(', ');
}

function flatten(array) {
  return array.reduce(function(a, b) {
    return a.concat(b);
  }, []);
}

function unique(array) {
  var result = [];
  array.forEach(function(item) {
    if (result.indexOf(item) === -1) {
      result.push(item);
    }
  });
  return result;
}

function pluck(array, prop) {
  return array.reduce(function(result, item) {
    if (item.hasOwnProperty(prop)) {
      result.push(item[prop]);
    }
    return result;
  }, []);
}


function debounce(func, delay) {
  var timeout;

  return function() {
    var args = arguments;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(function() {
      func.apply(null, args);
    }, delay);
  }
}



var data = [
	{"name": "Owen Avila", "email": "feugiat@estarcu.com", "phone": "0926 527 9796", "tags": "5, 6, 4, 1"},
	{"name": "Chiquita Moran", "email": "natoque@ligulaNullam.edu", "phone": "(011473) 62283", "tags": "9, 5"},
	{"name": "Kiara Warner", "email": "ante.blandit@lectusante.com", "phone": "(01663) 70112", "tags": "3, 6, 5, 8"},
	{"name": "Samuel Edwards", "email": "molestie.tortor@adipiscingMaurismolestie.edu", "phone": "0800 006451", "tags": "7"},
	{"name": "Levi Casey", "email": "Nunc.mauris@sodales.co.uk", "phone": "0800 1111", "tags": ""},
	{"name": "Colt Levy", "email": "commodo@pellentesquemassa.org", "phone": "0883 937 6164", "tags": "6, 10"},
	{"name": "Constance Hicks", "email": "eu.erat@dictum.edu", "phone": "(0116) 386 3506", "tags": "8, 2"},
	{"name": "Cain Brady", "email": "aliquet@blandit.com", "phone": "076 8102 9533", "tags": "2, 4, 6, 7"},
	{"name": "Libby Dalton", "email": "urna@pharetranibhAliquam.org", "phone": "(028) 9365 9955", "tags": "6, 10"},
	{"name": "Naomi Hancock", "email": "dolor.Quisque@Nulla.ca", "phone": "0363 302 4449", "tags": ""},
	{"name": "Martha Moreno", "email": "convallis@pede.co.uk", "phone": "056 1657 2511", "tags": ""},
	{"name": "Adrienne Benson", "email": "faucibus.id.libero@anuncIn.net", "phone": "(016977) 1283", "tags": "5, 4, 3"},
	{"name": "Ciara Stafford", "email": "augue.malesuada.malesuada@magnatellus.ca", "phone": "(0101) 588 5409", "tags": "1, 7"},
	{"name": "Beck Ross", "email": "Duis.mi@vel.com", "phone": "0800 602 0523", "tags": ""},
	{"name": "Amos Cooke", "email": "Aliquam.ultrices@Phasellusfermentumconvallis.co.uk", "phone": "0800 870067", "tags": ""},
	{"name": "Damon Walter", "email": "pede.blandit@rutrumFusce.ca", "phone": "(0111) 066 0037", "tags": "10, 6"},
	{"name": "Brynne Oliver", "email": "ipsum@dictum.net", "phone": "0912 696 5805", "tags": ""},
	{"name": "Noah Velez", "email": "Pellentesque.ultricies@tortorIntegeraliquam.org", "phone": "0954 831 5087", "tags": ""},
	{"name": "Quinn Anderson", "email": "malesuada.augue@dictumsapienAenean.co.uk", "phone": "0800 003 9285", "tags": "1, 3"},
	{"name": "Addison Kelly", "email": "sed.pede.nec@ipsumSuspendisse.ca", "phone": "(0114) 095 1845", "tags": ""},
	{"name": "Gail Morin", "email": "dolor@metusIn.net", "phone": "0800 1111", "tags": "3, 4, 8, 7"},
	{"name": "Gabriel Norris", "email": "neque.sed@necimperdietnec.org", "phone": "055 5337 3555", "tags": "10, 9"},
	{"name": "Samson Adkins", "email": "sed.sem@fringilla.com", "phone": "(027) 4265 0612", "tags": "10, 4"},
	{"name": "Kadeem Woodward", "email": "felis.eget.varius@vel.net", "phone": "(0111) 718 3943", "tags": "7, 6, 9"},
	{"name": "Wilma Vasquez", "email": "leo@Phasellus.edu", "phone": "(0119) 287 4467", "tags": "2, 3, 4"},
	{"name": "Ashely Bender", "email": "malesuada.fringilla.est@maurisblandit.edu", "phone": "(0181) 611 0046", "tags": "9, 5, 10"},
	{"name": "Lucian Humphrey", "email": "faucibus.lectus@CuraeDonec.net", "phone": "0377 440 7988", "tags": "2, 7, 10"},
	{"name": "Aileen Richardson", "email": "Proin@odio.net", "phone": "0845 46 47", "tags": "1, 7, 9, 5"},
	{"name": "Calvin Wong", "email": "sem@gravida.org", "phone": "0800 229 1316", "tags": "6"},
	{"name": "Jamal Flowers", "email": "auctor.velit@dapibus.com", "phone": "070 3739 7341", "tags": "2, 10"},
	{"name": "Garth Hooper", "email": "at.arcu@liberoet.ca", "phone": "0800 198216", "tags": "2"},
	{"name": "Gillian Byers", "email": "risus.at.fringilla@Duis.co.uk", "phone": "0800 816282", "tags": "3, 4, 9"},
	{"name": "Daphne Green", "email": "vulputate.eu@ac.co.uk", "phone": "0800 1111", "tags": "9, 4, 5"},
	{"name": "Hermione Johnson", "email": "in@montesnascetur.net", "phone": "0800 005258", "tags": "5, 2, 6"},
	{"name": "Malik Conrad", "email": "nisl@convallisligulaDonec.co.uk", "phone": "(012067) 85403", "tags": ""},
	{"name": "Ingrid Crawford", "email": "nisl.sem.consequat@a.org", "phone": "0340 074 6847", "tags": "10, 2, 8, 1"},
	{"name": "Aubrey Chan", "email": "dictum.cursus@necante.edu", "phone": "0845 46 46", "tags": "4, 6, 10"},
	{"name": "Madeson Pennington", "email": "facilisis@ornare.com", "phone": "0845 46 46", "tags": "6, 8, 2"},
	{"name": "Stacy Roth", "email": "eu.lacus.Quisque@elementumloremut.net", "phone": "0800 506 2335", "tags": "4, 5, 6, 2"},
	{"name": "Stewart Hansen", "email": "Suspendisse.ac@egestasblandit.co.uk", "phone": "0800 047938", "tags": "1, 10"},
	{"name": "Andrew Goff", "email": "tellus.faucibus.leo@fermentumconvallis.net", "phone": "055 6825 4557", "tags": ""},
	{"name": "Lacey Reynolds", "email": "Donec@ullamcorpermagna.net", "phone": "(021) 3223 7254", "tags": "5, 3, 8, 4"},
	{"name": "Reed Estrada", "email": "Praesent.interdum.ligula@quis.org", "phone": "0800 1111", "tags": "6"},
	{"name": "Aphrodite Albert", "email": "a.arcu.Sed@sagittis.edu", "phone": "(01179) 68031", "tags": "3"},
	{"name": "Shelly Petty", "email": "pede.Nunc.sed@Donecfringilla.ca", "phone": "055 0632 1881", "tags": "3"},
	{"name": "Fatima Guthrie", "email": "ultricies@sedpede.com", "phone": "0845 46 44", "tags": "4, 10"},
	{"name": "Tatyana Eaton", "email": "magna.sed@interdumenimnon.net", "phone": "0885 992 4290", "tags": "6"},
	{"name": "Gillian Bradley", "email": "et.ipsum.cursus@Maecenas.net", "phone": "07432 721252", "tags": ""},
	{"name": "Stuart Le", "email": "a@amet.net", "phone": "0800 704 8967", "tags": "6"},
	{"name": "Deborah Diaz", "email": "Morbi.sit@semmolestiesodales.ca", "phone": "0800 650780", "tags": "8"},
	{"name": "Sean Benjamin", "email": "turpis.egestas@sapien.org", "phone": "(01000) 570777", "tags": "5, 10, 7"},
	{"name": "Hammett Schultz", "email": "interdum.Sed.auctor@in.edu", "phone": "055 7700 4379", "tags": "4"},
	{"name": "Maile Walton", "email": "eros.nec@arcu.ca", "phone": "(016977) 1443", "tags": ""},
	{"name": "Devin Middleton", "email": "Aenean.eget.magna@Suspendissealiquetsem.edu", "phone": "0842 335 3649", "tags": "8, 5, 6"},
	{"name": "Aimee Greer", "email": "enim@Etiam.net", "phone": "076 6941 3088", "tags": "8"},
	{"name": "Quincy Workman", "email": "Phasellus.elit@hendrerit.net", "phone": "0800 308833", "tags": ""},
	{"name": "Paki Dominguez", "email": "a@hendrerit.co.uk", "phone": "0875 449 7522", "tags": "5, 1, 8"},
	{"name": "Desirae Joyner", "email": "nisi.magna@sodalesat.com", "phone": "0329 204 5544", "tags": "5"},
	{"name": "Macy Cunningham", "email": "Donec.est.mauris@Crassed.ca", "phone": "055 5571 1747", "tags": "8, 7, 9"},
	{"name": "Gareth Harrington", "email": "tempus.lorem@magnaSed.net", "phone": "0800 827 0924", "tags": ""},
	{"name": "Kaye Brewer", "email": "libero.dui.nec@natoquepenatibuset.com", "phone": "(016970) 54916", "tags": "10, 3"},
	{"name": "Stephen Frazier", "email": "neque.Sed@dapibus.co.uk", "phone": "0906 942 9915", "tags": "10, 6, 7, 3"},
	{"name": "Yetta Donaldson", "email": "rutrum.lorem@sedliberoProin.co.uk", "phone": "(01558) 56719", "tags": "6, 2, 10"},
	{"name": "Magee Donaldson", "email": "est@esttemporbibendum.net", "phone": "0322 824 2323", "tags": "10, 9, 7, 2"},
	{"name": "MacKensie Ross", "email": "hymenaeos.Mauris.ut@velarcu.net", "phone": "056 2878 8855", "tags": "1"},
	{"name": "Donovan Rowland", "email": "vel@laciniaat.com", "phone": "0816 069 0182", "tags": "8, 5, 9"},
	{"name": "Yolanda David", "email": "magna.Suspendisse.tristique@imperdietnon.edu", "phone": "055 6406 6706", "tags": "4, 8, 10"},
	{"name": "Kamal Meadows", "email": "sit.amet@etlacinia.net", "phone": "056 1356 4392", "tags": ""},
	{"name": "Vance Osborn", "email": "nec.diam@ullamcorper.net", "phone": "(016977) 7355", "tags": "7, 6, 2, 8"},
	{"name": "Herman Holmes", "email": "Duis.at.lacus@nislMaecenas.net", "phone": "0845 46 45", "tags": "10"},
	{"name": "Hermione Buckner", "email": "auctor.velit@mollislectus.ca", "phone": "0938 638 6034", "tags": "3, 2, 4"},
	{"name": "Amy Pitts", "email": "est@congueIn.edu", "phone": "(0111) 356 3264", "tags": "6, 9"},
	{"name": "James Patrick", "email": "mi.pede@elitEtiam.edu", "phone": "0980 763 1361", "tags": "1"},
	{"name": "Vincent Hooper", "email": "malesuada.fames@erat.ca", "phone": "(0118) 587 7248", "tags": "6"},
	{"name": "Brody Mccormick", "email": "aliquet@lectus.org", "phone": "(0117) 209 8001", "tags": "9, 8, 1"},
	{"name": "Porter Holt", "email": "non.hendrerit@velitjustonec.org", "phone": "055 5860 1216", "tags": "5, 8"},
	{"name": "Maryam Rocha", "email": "sed.turpis@vitaemaurissit.com", "phone": "070 6541 5506", "tags": "2, 10"},
	{"name": "Hyatt Raymond", "email": "velit@id.co.uk", "phone": "(020) 9728 9331", "tags": "7, 5, 1, 6"},
	{"name": "Ora Orr", "email": "Lorem.ipsum@penatibuset.org", "phone": "(0121) 055 6155", "tags": "4, 5"},
	{"name": "Jonas Hoover", "email": "amet.diam@orciquislectus.edu", "phone": "(015551) 17688", "tags": "3"},
	{"name": "Kasimir Rivers", "email": "dictum.placerat.augue@in.org", "phone": "0863 126 8596", "tags": "4"},
	{"name": "Hilel Yates", "email": "egestas.Aliquam.fringilla@mauriselitdictum.ca", "phone": "(0131) 498 1318", "tags": "5, 6, 4, 1"},
	{"name": "Robert Hale", "email": "blandit@telluslorem.org", "phone": "0800 137232", "tags": "3"},
	{"name": "Constance Fitzgerald", "email": "cursus.et@dolor.edu", "phone": "(018958) 07200", "tags": "8, 9"},
	{"name": "Idona Mathis", "email": "dapibus.ligula.Aliquam@lacusAliquam.net", "phone": "0379 155 2072", "tags": "9, 7"},
	{"name": "Craig Rocha", "email": "fermentum.vel@augue.com", "phone": "07624 756183", "tags": "5, 10, 6, 8"},
	{"name": "Lucian Rollins", "email": "iaculis.quis.pede@eratEtiam.co.uk", "phone": "0314 579 1710", "tags": "4, 6, 7"},
	{"name": "Sawyer Montgomery", "email": "auctor.odio@eleifendnondapibus.org", "phone": "076 2792 6826", "tags": "10, 9, 1"},
	{"name": "Fletcher Puckett", "email": "mauris@cursusinhendrerit.co.uk", "phone": "0989 947 7957", "tags": "10, 7, 2"},
	{"name": "Norman Herrera", "email": "nec.ligula.consectetuer@pedeacurna.org", "phone": "07514 113571", "tags": "10, 1"},
	{"name": "Callie Molina", "email": "arcu.Morbi.sit@Seddictum.com", "phone": "076 1508 5329", "tags": ""},
	{"name": "Olga Molina", "email": "ultricies@vellectus.com", "phone": "(01338) 16769", "tags": "1"},
	{"name": "Orson Park", "email": "lacus.Mauris.non@aliquam.edu", "phone": "(029) 0363 2875", "tags": "9, 8, 3, 10"},
	{"name": "Derek Vang", "email": "Integer.aliquam.adipiscing@lectusante.net", "phone": "(0111) 033 5495", "tags": "2, 7, 1, 3"},
	{"name": "Michael Frederick", "email": "Maecenas.ornare.egestas@egestasAliquamfringilla.ca", "phone": "(027) 6456 6861", "tags": ""},
	{"name": "Carl Talley", "email": "nibh@Suspendissecommodo.co.uk", "phone": "0800 947 0135", "tags": "1, 3"},
	{"name": "Rafael Wells", "email": "pretium@temporaugueac.co.uk", "phone": "0845 46 48", "tags": "5, 3, 10"},
	{"name": "Noah Hardy", "email": "ipsum.Phasellus.vitae@Fuscemilorem.ca", "phone": "(01272) 228367", "tags": "4, 5"},
	{"name": "Jemima Hatfield", "email": "Phasellus@accumsan.ca", "phone": "(015203) 88257", "tags": "1, 4, 10"},
	{"name": "Quyn Perez", "email": "nunc.risus.varius@ornareInfaucibus.com", "phone": "0381 173 0860", "tags": ""}
];



data.forEach(function(datum) {
  if (datum.tags === "") {
    datum.tags = [];
  } else {
    datum.tags = datum.tags.split(', ');;
  }
});
