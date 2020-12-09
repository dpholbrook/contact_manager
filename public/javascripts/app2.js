document.addEventListener('DOMContentLoaded', () => {
  const App = {
    currentContactId: null,

    init() {
      UI.init();
      API.init();
      FormManager.init();
    },

    deleteContact(event) {
      if (event.target.id === 'delete') {
        event.preventDefault();
        let contact = ContactManager.getContact(event)
        API.deleteContact(contact);
      }
    },

    editContact(event) {
      if (event.target.id === 'edit') {
        event.preventDefault();
        FormManager.editing = true;
        let contact = ContactManager.getContact(event);
        this.currentContactId = contact.id;
        UI.displayForm(contact);
      }
    },

    filterByTag(event) {
      if (event.target.classList.contains('contact_tag')) {
        event.preventDefault();
        let tagWord = event.target.textContent;
        let filterMessage = `Contacts with '${tagWord}' tag:`;
        let filteredContacts = ContactManager.filterContacts(tagWord);
        UI.renderContacts(filteredContacts, filterMessage);
      }
    },

    searchFilter(event) {
      let searchTerm = event.target.value;
      let pattern = new RegExp(searchTerm, 'i');
      let filteredContacts = ContactManager.filterContacts(pattern);  
      UI.renderContacts(filteredContacts);
    },
  };

  const API = {
    init() {
      this.getContacts();
    },

    getContacts() {
      fetch('/api/contacts')
        .then(response => response.json())
        .then(json => {
          ContactManager.set(TagManager.parseTags(json));
          UI.renderContacts(ContactManager.contacts);
          TagManager.init();
        });
    },

    addContact(data) {
      fetch('api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: data,
      })
      .then(this.getContacts())
      .then(UI.contactForm.reset());
    },
  
    updateContact(data, id) {
      fetch(`api/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: data,
      })
      .then(this.getContacts())
      .then(UI.contactForm.reset());
    },

    deleteContact(contact) {
      if (window.confirm(`Do you really want to delete the contact ${contact.full_name}?`)) {
        fetch(`api/contacts/${contact.id}`, {method: 'DELETE'})
        .then(this.getContacts());
      }
    },
  };

  const TagManager = {
    tags: [],

    scrapeTags() {
      return ContactManager.contacts.flatMap(contact => contact.tags);
    },

    removeDuplicates(tags) {
      let uniques = [];
      tags.forEach(tag => {
        if (!uniques.includes(tag)) {
          uniques.push(tag);
        }
      });

      return uniques;
    },

    parseTags(contacts) {
      contacts.forEach(contact => {
        let tagsArray;
        if (contact.tags) {
          tagsArray = contact.tags.split(',').map(tag => tag.trim())
        } else {
          tagsArray = [];
        }
        contact.tags = tagsArray;
      });

      return contacts;
    },

    getTags() {
      return this.tags;
    },

    addTag(event) {
      event.preventDefault();
      let newTag = (event.target.previousElementSibling.value);
      this.tags.push(newTag);
      this.tags = this.removeDuplicates(this.tags);
      UI.renderTags();
    },

    init() {
      this.tags = this.removeDuplicates(this.scrapeTags());
    },
  };

  const ContactManager = {
    contacts: [],

    set(collection) {
      this.contacts = collection;
    },

    getContact(event) {
      let id = Number(event.target.closest('.contact_container').dataset.id);
      return this.filterContacts(id);
    },
  
    filterContacts(criteria) {
      let filteredContacts;
      if (typeof criteria === 'string') {
        filteredContacts = this.contacts.filter(contact => {
          return contact.tags.includes(criteria);
        });
      } else if (typeof criteria === 'number') {
        filteredContacts = this.contacts.find(contact => {
          return contact.id === criteria;
        });
      } else {
        filteredContacts = this.contacts.filter(contact => {
          return criteria.test(contact.full_name);
        });
      }

      return filteredContacts;
    },
  };

  const FormManager = {
    init() {
      this.form = document.querySelector('form');
      this.header = UI.contactFormDisplay.querySelector('h2');
      this.editing = false;
    },

    submitForm(event) {
      event.preventDefault();
      UI.clearErrorMessages();
      if (!this.form.checkValidity()) {
        UI.renderErrorMessages(this.form);
      } else {
        this.sendFormData();
        this.form.reset();
      }
    },

    sendFormData() {
      let type = this.header.textContent;
      let data = this.encodeData();
      if (type === 'Add Contact') {
        API.addContact(data);
      } else if (type === 'Edit Contact') {
        let id = App.currentContactId;
        data.append('id', id)
        API.updateContact(data, id);
      }
    },

    encodeData() {
      let formData = new FormData(this.form);
      let tags = [];
      let data = [];
  
      for ([key, value] of formData) {
        if (key.includes('tag')) {
          if (key !== 'add_tag') {
            tags.push(value);
          }
        } else {
          data.push([key, value]);
        }
      }
  
      tagString = tags.join(', ');
      data.push(['tags', tagString])
  
      return new URLSearchParams(data);
    },
  };

  const UI = {
    init() {
      this.getElements();
      this.compileTemplates();
      this.bindEvents();
    },

    renderContacts(contacts, filterMessage) {
      if (contacts.length > 0) {
        this.contactsDisplay.querySelector('div').innerHTML = this.contactsTemplate({contacts});
        $(this.filterMessage).hide();
        this.show($(this.contactsDisplay));
        if (filterMessage) {
          this.filterMessageContent.textContent = filterMessage;
          $(this.filterMessage).show();
        }
      } else {
        this.contactsDisplay.querySelector('div').innerHTML = "<h1>There are no contacts to display.<h1>";
      }
    },

    displayAddContact() {
      FormManager.editing = false;
      this.displayForm();
    },

    displayForm(contact) {
      this.renderTags();
      if (FormManager.editing) {
        this.populateFormInputs(contact);
        FormManager.header.textContent = 'Edit Contact';
      } else {
        FormManager.header.textContent = 'Add Contact';
      }
      this.show($(this.contactFormDisplay));
    },

    populateFormInputs(contact) {
      let fullName = this.contactFormDisplay.querySelector("#full_name");
      let email = this.contactFormDisplay.querySelector("#email");
      let phone = this.contactFormDisplay.querySelector("#phone");
      let checkboxes = this.contactFormDisplay.querySelectorAll("[type='checkbox']");
      fullName.value = contact.full_name;
      email.value = contact.email;
      phone.value = contact.phone_number;
  
      checkboxes.forEach(checkbox => {
        if (contact.tags.includes(checkbox.value)) {
          checkbox.checked = true;
        }
      });
    },

    renderTags() {
      let tags = TagManager.getTags()
      this.contactForm.querySelector('fieldset > div').innerHTML = this.tagsTemplate({tags});
    },

    show($display) {
      $(this.contactsDisplay).hide();
      $(this.contactFormDisplay).hide();
  
      $display.show();
    },

    clearFilter() {
      $(this.filterMessage).fadeOut();
      this.renderContacts(ContactManager.contacts);
    },

    cancelAddContact() {
      UI.clearErrorMessages();
      this.contactForm.reset();
      this.show($(this.contactsDisplay));
    },

    clearErrorMessages() {
      this.contactForm.querySelectorAll('.error_message').forEach(errorMessage => {
        errorMessage.textContent = '';
      });

      this.contactForm.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
      });
    },

    renderErrorMessages(form) {
      form.querySelectorAll('input').forEach(input => {
        if (input.validity.valueMissing 
        || input.validity.patternMismatch
        || input.validity.typeMismatch ) {
          let errorMessage = input.nextElementSibling;
          let label = input.parentNode.firstElementChild.textContent.toLowerCase();
          errorMessage.textContent = `Please enter a valid ${label}.`;
          input.classList.add('error');
        }
      });
    },

    getElements() {
      this.contactsDisplay = document.querySelector('#contacts_display');
      this.addContactButton = document.querySelector('.add_contact_button');
      this.contactFormDisplay = document.querySelector('#contact_form_display');
      this.contactForm = document.querySelector('form');
      this.addTagButton = document.querySelector('#add_tag_button');
      this.filterMessage = document.querySelector('#filter_message');
      this.filterMessageContent = this.filterMessage.firstElementChild;
      this.cancelButton = document.querySelector('#cancel_button');
      this.searchBar = document.querySelector('#search');
      this.filterMessage = document.querySelector('#filter_message');
      this.clearFilterButton = document.querySelector('#clear_filter_button');
    },

    bindEvents() {
      this.addContactButton.addEventListener('click', this.displayAddContact.bind(this));
      this.contactForm.addEventListener('submit', FormManager.submitForm.bind(FormManager));
      this.addTagButton.addEventListener('click', TagManager.addTag.bind(TagManager));
      document.body.addEventListener('click', App.filterByTag.bind(App));
      this.cancelButton.addEventListener('click', this.cancelAddContact.bind(this));
      document.body.addEventListener('click', App.deleteContact.bind(App));
      document.body.addEventListener('click', App.editContact.bind(App));
      this.searchBar.addEventListener('keyup', App.searchFilter.bind(App));
      this.clearFilterButton.addEventListener('click', this.clearFilter.bind(this));
    },

    compileTemplates() {
      this.contactsTemplate = Handlebars.compile(document.querySelector('#contacts_template').innerHTML);
      this.tagsTemplate = Handlebars.compile(document.querySelector('#tags_template').innerHTML);
    },
  };

  App.init();
});