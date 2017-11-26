function Contact(data, id) {
  this.id = id || data.id;
  this.name = data.name || '';
  this.email = data.email || '';
  this.phone = data.phone || '';
  this.tags = data.tags || [];
  this.makeUniqueTags();
  this.sortTags();
}

Contact.prototype = {
  update: function(data) {
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.tags = data.tags;
    this.makeUniqueTags();
    this.sortTags();
  },

  hasTag: function(tag) {
    return this.tags.indexOf(tag) !== -1;
  },

  sortTags: function() {
    this.tags = sort(this.tags);
  },

  makeUniqueTags: function() {
    this.tags = unique(this.tags);
  }
}

var Tags = {
  list: [],
  active: [],

  load: function() {
    var uniqueTags = [];
    // get all tags for all contacts
    var allTags = pluck(Contacts.list, 'tags');
    uniqueTags = unique(flatten(allTags));

    this.list = uniqueTags;
    this.list = sort(this.list);
    return uniqueTags;
  },

  update: function(toAdd, toRemove) {
    this.add(toAdd);
    this.remove(toRemove);
  },

  add: function(tags) {
    var self = this;
    var addedTags = [];
    unique(tags).forEach(function(tag) {
      if (self.list.indexOf(tag) === -1) {
        addedTags.push(tag);
      }
    });

    [].push.apply(self.list, addedTags);
    this.list = unique(sort(this.list));
    return addedTags;
  },

  remove: function(tags) {
    var self = this;
    var canDelete;
    var removedTags = [];
    tags.forEach(function(tag) {
      if (!self.tagExists(tag)) {
        self.removeOne(tag);
        self.removeActive(tag);
        removedTags.push(tag);
      }
    });

    return removedTags;
  },

  removeOne: function(tag) {
    this.list.splice(this.list.indexOf(tag), 1);
  },

  removeActive: function(tag) {
    var activeTagIndex = this.active.indexOf(tag);
    if (activeTagIndex !== -1) {
      this.active.splice(activeTagIndex, 1);
    }
  },

  tagExists: function(tag) {
    return Contacts.list.some(function(contact) {
      return contact.hasTag(tag);
    });
  },

  isActive: function(tag) {
    return this.active.indexOf(tag) !== -1;
  },

  activeIndex: function(tagName) {
    return this.active.findIndex(function(tag) {
      return tag === tagName;
    });
  },

  toggleActiveOne: function(tag) {
    if (this.activeIndex(tag) !== -1) {
      this.active.splice(this.activeIndex(tag), 1);
    } else {
      this.active.push(tag);
    }
  },

  toggleActive: function(tags) {
    tags.forEach(this.toggleActiveOne.bind(this));
  },

}

var Contacts = {
  list: [],
  lastId: 0,

  add: function(data) {
    this.list.push(new Contact(data, this.nextId()));
    this.sort();
    Tags.add(data.tags);
    this.save();
  },

  update: function(data) {
    var index = this.getIndex(data.id);
    var contact = this.list[index];
    var oldTags = contact.tags;
    contact.update(data);
    this.sort();
    Tags.update(data.tags, oldTags);
    this.save();
  },

  remove: function(id) {
    Tags.remove(this.removeContact(id).tags);
    this.save();
  },

  removeContact: function(id) {
    return this.list.splice(this.getIndex(id), 1)[0];
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
    var nameParts, fullName, firstName, lastName;
    if (query === '') { return this.list; }

    // found on stackoverflow... escapes characters used commonly in
    // regular expressions
    query = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    var regex = new RegExp('^' + query, 'i');
    return this.list.filter(function(contact) {
      fullName = contact.name;
      nameParts = fullName.split(' ');
      firstName = nameParts[0];
      lastName = nameParts[nameParts.length - 1];
      return firstName.match(regex) || lastName.match(regex) || fullName.match(regex);
    });
  },

  filterByTags: function() {
    var self = this;
    if (Tags.active.length === 0) { return self.list; }

    return self.list.filter(function(contact) {
      return Tags.active.some(contact.hasTag.bind(contact));
    });
  },

  sort: function() {
    this.list = sort(this.list, function(a, b) {
      var nameA = a.name.toUpperCase();
      var nameB = b.name.toUpperCase();
      if (nameA < nameB) { return -1; }
      if (nameA > nameB) { return 1; }
      return 0;
    });
  },

  load: function() {
    var contactsJson = JSON.parse(localStorage.getItem('contacts')) || [];
    this.list = contactsJson.map(function(data) {
      return (new Contact(data));
    });
    this.sort();

    this.setLastId();
  },

  save: function() {
    localStorage.setItem('contacts', JSON.stringify(this.list));
  },

  nextId: function() {
    this.lastId++;
    return this.lastId;
  },

  setLastId: function() {
    if (this.list.length === 0) { return 0; }

    var ids = pluck(this.list, 'id');
    this.lastId = Math.max.apply(Math, ids);
  }
}

var App = {
  templates: {},
  duration: 600,

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

  write: function(sublist) {
    list = sublist ? sublist : Contacts.list;
    this.writeContacts(list);
    this.writeTagList();
  },

  writeContacts: function(contacts) {
    this.$contacts.html(this.templates.contacts_template({ contacts: contacts }));
  },

  writeTagList: function() {
    this.$tagList.html(this.templates.tag_list_template({ tags: Tags.list }));
  },

  styleActiveTags: function() {
    var $activeTags = $('.tag').filter(function() {
      return Tags.isActive(this.textContent);
    });
    $activeTags.addClass('active');
  },

  add: function(e) {
    e.preventDefault();
    var formData = this.getFormData();
    if (this.processFormErrors()) { return; }

    formData.id ? Contacts.update(formData) : Contacts.add(formData);

    this.write(this.filterByName());
    this.showContacts();
    this.resetForm();
  },

  remove: function(e) {
    e.preventDefault();
    var $contact = $(e.target).closest('li');
    var id = +$contact.attr('data-id');

    if (!this.confirmRemove(Contacts.get(id))) { return; }

    $contact.slideUp(this.duration);
    setTimeout(function() {
      Contacts.remove(id);
      $contact.remove();
      this.showContacts();
      this.writeTagList();
      this.styleActiveTags();
    }.bind(this), this.duration);
  },

  confirmRemove: function(contact) {
    return confirm("Are you sure you want to delete " + contact.name + "?");
  },

  showContacts: function(e) {
    if (e) { e.preventDefault(); }

    this.revealContactsList();

    if (Tags.list.length > 0) {
      this.$tagList.slideDown(this.duration);
    } else {
      this.$tagList.slideUp(this.duration);
    }

    this.styleActiveTags();

    this.showFilteredContacts(Contacts.filterByTags());
  },

  showFilteredContacts: function(contacts, preventAnimate) {
    var inList;
    var toShow = [];
    var toHide = [];

    this.$contacts.find('> li').each(function(index, element) {
      inList = contacts.some(function(contact) {
        return elementHasId(element, contact.id);
      });
      inList ? toShow.push(element) : toHide.push(element);
    });

    this.revealContactsList();
    if (preventAnimate) {
      $(toShow).show();
      $(toHide).hide();
    } else {
      $(toShow).slideDown(this.duration);
      $(toHide).slideUp(this.duration);
    }
  },

  revealContactsList: function() {
    this.$f.slideUp(this.duration);
    this.$emptyResult.slideUp(this.duration);
    this.$contacts.slideDown(this.duration);
    this.$actions.slideDown(this.duration);
  },

  revealForm: function(e) {
    this.$f.slideDown(this.duration);
    this.$contacts.slideUp(this.duration);
    this.$actions.slideUp(this.duration);
    this.$emptyResult.slideUp(this.duration);
  },

  revealAddForm: function(e) {
    e.preventDefault();
    this.$f.find('h2').text('Create Contact');
    this.revealForm();
  },

  revealEditForm: function() {
    this.$f.find('h2').text('Edit Contact');
    this.revealForm();
  },

  loadForm: function(id) {
    var contact = id ? Contacts.get(id) : {};
    this.$f.html(this.templates.form_template(contact));
  },

  resetForm: function() {
    this.$f.find('input[name]').val("");
  },

  getFormData: function() {
    return {
      id: +this.$f.find('input[name="id"]').val(),
      name: this.$f.find('#name').val(),
      email: this.$f.find('#email').val(),
      phone: this.$f.find('#phone').val(),
      tags: parseTags(this.$f.find('#tags').val()),
    }
  },

  getFormErrors: function() {
    var data = this.getFormData();
    var errors = {};
    // very simple email validation (anything@anything.anything)
    var emailRegex = /^\S+@\S+\.\S+$/;
    // very simple phone number validation (only numbers '()' and '-')
    var phoneRegex = /^[0-9\(\)\- ]+$/;

    errors.name = data.name.trim() === "";
    errors.email = !data.email.match(emailRegex);
    errors.phone = !data.phone.match(phoneRegex);
    
    return errors;
  },

  processFormErrors: function() {
    var errors = this.getFormErrors();
    var $p;

    var errorOccurred = false;
    for (var prop in errors) {
      $p = $('#' + prop).closest('dl').next('p.invalid');
      if (errors[prop]) {
        $p.slideDown(this.duration);
        errorOccurred = true;
      } else {
        $p.slideUp(this.duration);
      }
    }

    return errorOccurred;
  },

  edit: function(e) {
    e.preventDefault();
    var $contact = $(e.target).closest('li');
    var id = +$contact.attr('data-id');
    this.loadForm(id);
    this.revealEditForm();
  },

  filterByName: function(e) {
    return Contacts.filterByName(this.$search.val());
  },

  showFilter: function(e) {
    var query = this.$search.text();
    var filteredList = this.filterByName();

    if (query || filteredList.length > 0) {
      this.write(filteredList);
      this.styleActiveTags();
      this.showFilteredContacts(Contacts.filterByTags(), true);
    } else {
      this.showEmptyResult();
    }
  },

  showEmptyResult: function() {
    this.$emptyResult.slideDown(this.duration);
    this.$contacts.slideUp(this.duration);
    this.$emptyResult.find('span').text(this.$search.val());
  },

  tagClickEvent: function(e) {
    e.preventDefault();
    var $clickedTag = $(e.target);

    if (this.$f.filter(':visible').length === 1) {
      this.addTagToInput(e);
    } else {
      this.filterByTags($clickedTag.text());
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

  filterByTags: function(tagName) {
    var $matchedTags = $('.tag').filter(function(index, tag) {
      return tag.textContent === tagName;
    });

    Tags.toggleActiveOne(tagName);
    $matchedTags.toggleClass('active');
    this.showFilteredContacts(Contacts.filterByTags());
  },

  bindEvents: function() {
    this.$actions.find('a').on('click', this.revealAddForm.bind(this));
    this.$f.on('click', '#cancel', this.showContacts.bind(this));
    this.$f.on('submit', this.add.bind(this));
    this.$contacts.on('click', '.edit', this.edit.bind(this));
    this.$contacts.on('click', '.delete', this.remove.bind(this));
    this.$search.on('input', this.showFilter.bind(this));
    $('main').on('click', '.tag', this.tagClickEvent.bind(this));
  },

  load: function() {
    Contacts.load();
    Tags.load();
    this.loadForm();
  },

  init: function() {
    // cache elements
    this.$f = $('form');
    this.$contacts = $('#contacts');
    this.$tagList = $('#tag_list');
    this.$emptyResult = $('#empty_result');
    this.$search = $('#search');
    this.$actions = $('.actions');

    this.cacheTemplates();
    this.registerPartials();
    this.removeHandlebarsScripts();

    this.load();

    // add in some test data if there are no contacts
    if (Contacts.list.length === 0) {
      for (var i = 0, len = data.length; i < len; i++) {
        Contacts.add(data[i]);
      }
    }

    this.write();
    this.showContacts();
    this.showFilter = debounce(this.showFilter.bind(this), 300);
    this.bindEvents();
  }
}


$(App.init.bind(App));

// Utilities

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

function sort(array, comparator) {
  var newArr = array.slice();
  if (typeof comparator === 'function') {
    newArr.sort(comparator);
  } else {
    newArr.sort(function(a, b) {
      if (a.toUpperCase() < b.toUpperCase()) { return -1; }
      if (a.toUpperCase() > b.toUpperCase()) { return 1; }
      return 0;
    });
  }
  return newArr;
}

function elementHasId(element, id) {
  return +element.getAttribute('data-id') === id;
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
  {"name": "My Name", "email": "feugiat@estarcu.com", "phone": "0926 527 9796", "tags": ["engineering", "front-end", "software"]},
  {"name": "B Name", "email": "natoque@ligulaNullam.edu", "phone": "(011473) 62283", "tags": ["engineering", "Handlebars", "SQL"]},
  {"name": "Kiara Warner", "email": "ante.blandit@lectusante.com", "phone": "(01663) 70112", "tags": ["back-end", "JavaScript", "Ruby"]},
  {"name": "Samuel Edwards", "email": "molestie.tortor@adipiscingMaurismolestie.edu", "phone": "0800 006451", "tags": ["developer", "engineering", "JavaScript", "Ruby"]},
  {"name": "A Name", "email": "molestie.tortor@adipiscingMaurismolestie.edu", "phone": "0800 006451", "tags": ["HTML", "CSS", "JavaScript", "front-end"]},
  {"name": "S Name", "email": "mosi.tro@aiicnMuislestie.edu", "phone": "0800 006451", "tags": ["Ruby", "Sinatra", "back-end"]},
];
